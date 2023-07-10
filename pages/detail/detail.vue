<template>
	<view class="detail">
		<view class="container">
			<view v-if="loading">
				<u-skeleton rows="6" title loading></u-skeleton>
			</view>
			<view v-else>
				<view class="title">{{ articleInfo.title }}</view>
				<view class="userinfo">
					<view class="avatar">
						<image
							:src="articleInfo.user_id[0].avatar_file ? articleInfo.user_id[0].avatar_file.url : '../../static/images/user-default.jpg'"
							mode="aspectFill"
						></image>
					</view>
					<view class="text">
						<view class="name">{{ articleInfo.user_id[0].nickname }}</view>
						<view class="small">
							<uni-dateformat :date="articleInfo.publish_date" :threshold="[60000, 3600000]"></uni-dateformat>
							·发布于{{ articleInfo.province }}
						</view>
					</view>
				</view>
				<!-- uview富文本解析器 -->
				<u-parse :content="articleInfo.content"></u-parse>
				<view class="like" @click="onLike">
					<view class="btn" :class="{ active: articleInfo.islike }">
						<text class="iconfont icon-dianzan1"></text>
						<text v-if="articleInfo.like_count">{{ articleInfo.like_count }}</text>
					</view>
					<view class="users">
						<image :src="item" mode="aspectFill" v-for="(item, index) in avtarlist" :key="index"></image>
					</view>
					<view class="text">
						<text class="num">{{ articleInfo.view_count }}</text>
						人看过
					</view>
				</view>
				<view class="reply" v-if="!comList.length">
					<u-empty mode="comment" icon="http://cdn.uviewui.com/uview/empty/comment.png"></u-empty>
				</view>
				<view class="comment">
					<view v-for="item in comList" :key="item._id">
						<comment-item :comment="item" @comDelete="onComDelete"></comment-item>
					</view>
				</view>
				<comment-frame :articleId="articleId" :comment_type="comment_type" @newid="onNewid"></comment-frame>
			</view>
		</view>
	</view>
</template>

<script>
import { store } from '@/uni_modules/uni-id-pages/common/store.js';
const db = uniCloud.database();
const cmd = db.command;
const toolObj = uniCloud.importObject('toolObj', {
	customUI: true
});
export default {
	data() {
		return {
			loading: true,
			articleId: '',
			articleInfo: {},
			time: 0,
			avtarlist: [],
			comment_type: 0,
			comList: []
		};
	},
	computed: {
		hasLogin() {
			return store.hasLogin;
		}
	},
	onLoad(e) {
		if (!e.id) {
			this.errfun();
			return;
		}
		this.articleId = e.id;
		this.getData();
		this.getComment();
		this.updatereading();
		this.getlikeavtar();
	},
	methods: {
		errfun() {
			uni.showToast({
				title: '参数错误'
			});
			setTimeout(() => {
				uni.reLaunch({
					url: '/pages/index/index'
				});
			}, 800);
		},
		// 获取评论
		async getComment() {
			let comtemp = db
				.collection('quanzi_comment')
				.where({
					article_id: this.articleId,
					comment_type: 0
				})
				.orderBy('comment_date', 'desc')
				.limit(5)
				.getTemp();
			let usertemp = db.collection('uni-id-users').field('_id,username,nickname,avatar_file ').getTemp();
			let res = await db.collection(comtemp, usertemp).get();
			this.comList = res.result.data;
			//获取二级回复的数量
			let idarr = this.comList.map((item) => {
				return item._id;
			});
			let res1 = await db
				.collection('quanzi_comment')
				.where({
					reply_comment_id: db.command.in(idarr)
				})
				.groupBy('reply_comment_id')
				.groupField('sum(1) as total')
				.get();
			this.comList.forEach((item1) => {
				let obj = res1.result.data.find((item2) => item2.reply_comment_id == item1._id);
				if (obj) {
					this.$set(item1, 'replyNumLv2', obj.total);
				} else {
					this.$set(item1, 'replyNumLv2', 0);
				}
			});
		},
		// 获取文章
		getData() {
			let quanziTemp = db
				.collection('quanzi_article')
				.where({
					_id: this.articleId
				})
				.getTemp();
			let idUsersTemp = db.collection('uni-id-users').field('_id,nickname,avatar_file').getTemp();
			let likeTemp = db
				.collection('quanzi_like')
				.where({
					article_id: this.articleId,
					user_id: db.getCloudEnv('$cloudEnv_uid')
				})
				.getTemp();
			const arr = [quanziTemp, idUsersTemp];
			//登录状态才获取点赞表
			if (this.hasLogin) {
				arr.push(likeTemp);
			}
			db.collection(...arr)
				.get()
				.then((res) => {
					if (!res.result.data) {
						this.errfun();
						return;
					}
					res.result.data[0].islike = this.hasLogin && Boolean(res.result.data[0]._id.quanzi_like.length);
					this.articleInfo = res.result.data[0];
					uni.setNavigationBarTitle({
						title: this.articleInfo.title
					});
					this.loading = false;
				});
		},
		// 阅读量修改
		updatereading() {
			// 调用云对象里的函数
			toolObj.operation('quanzi_article', 'view_count', this.articleId, 1);
		},
		//点赞
		async onLike() {
			if (!this.hasLogin) {
				uni.showModal({
					title: '是否登录？',
					success: (e) => {
						if (e.confirm) {
							uni.navigateTo({
								url: '/uni_modules/uni-id-pages/pages/login/login-withpwd'
							});
						}
					}
				});
				return;
			}
			if (Date.now() - this.time < 1000) {
				return;
			}
			this.time = Date.now();
			this.articleInfo.islike = !this.articleInfo.islike;
			this.articleInfo.islike ? this.articleInfo.like_count++ : this.articleInfo.like_count--;
			let res = await db
				.collection('quanzi_like')
				.where({
					article_id: this.articleId,
					user_id: db.getCloudEnv('$cloudEnv_uid')
				})
				.count();
			if (res.result.total) {
				await db
					.collection('quanzi_like')
					.where({
						article_id: this.articleId,
						user_id: db.getCloudEnv('$cloudEnv_uid')
					})
					.remove();
				// 调用云对象里的函数
				toolObj.operation('quanzi_article', 'like_count', this.articleId, -1);
			} else {
				await db.collection('quanzi_like').add({
					article_id: this.articleId
				});

				// 调用云对象里的函数
				toolObj.operation('quanzi_article', 'like_count', this.articleId, 1);
			}
		},
		// 获取点过赞的用户
		async getlikeavtar() {
			let liketem = db
				.collection('quanzi_like')
				.where({
					article_id: this.articleId
				})
				.field('user_id,publish_date')
				.getTemp();
			let usertemp = db.collection('uni-id-users').field('_id,avatar_file').getTemp();
			let res = await db.collection(liketem, usertemp).orderBy('publish_date', 'desc').limit(5).get();
			this.avtarlist = res.result.data
				.map((item) => {
					if (item.user_id[0].avatar_file) {
						return item.user_id[0].avatar_file.url;
					} else {
						return '../../static/images/user-default.jpg';
					}
				})
				.reverse();
		},
		//评论新增后的回调
		onNewid(obj) {
			this.comList.unshift({
				...obj
			});
		},
		//删除评论的回调
		onComDelete(id) {
			this.getComment();
		}
	}
};
</script>

<style lang="scss" scoped>
.detail {
	background: #f8f8f8;
	min-height: calc(100vh - var(--window-top));

	.container {
		padding: 30rpx;
		background: #fff;

		.title {
			font-size: 46rpx;
			color: #333;
			line-height: 1.4em;
			font-weight: 600;
		}

		.userinfo {
			padding: 20rpx 0 50rpx;
			display: flex;
			align-items: center;

			.avatar {
				width: 60rpx;
				height: 60rpx;
				padding-right: 15rpx;

				image {
					width: 100%;
					height: 100%;
					border-radius: 50%;
				}
			}

			.text {
				font-size: 28rpx;
				color: #555;

				.small {
					font-size: 20rpx;
					color: #999;
				}
			}
		}

		.content {
		}

		.like {
			display: flex;
			flex-direction: column;
			align-items: center;
			padding: 80rpx 50rpx 50rpx;

			.btn {
				width: 260rpx;
				height: 120rpx;
				background: #e4e4e4;
				border-radius: 100rpx;
				color: #fff;
				display: flex;
				justify-content: center;
				align-items: center;
				flex-direction: column;
				font-size: 28rpx;

				.iconfont {
					font-size: 50rpx;
				}

				&.active {
					background: #0199fe;
				}
			}

			.text {
				font-size: 26rpx;
				color: #666;

				.num {
					color: #0199fe;
				}

				.spot {
					padding: 0 10rpx;
				}
			}

			.users {
				display: flex;
				justify-content: center;
				padding: 30rpx 0;

				image {
					width: 50rpx;
					height: 50rpx;
					border-radius: 50%;
					border: 3px solid #fff;
					margin-left: -20rpx;
				}
			}
		}
	}

	.comment {
		background-color: #fff;
		padding-bottom: 120rpx;
	}
}
</style>