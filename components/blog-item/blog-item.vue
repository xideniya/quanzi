<template>
	<!-- 用文章ID添加一个动态类名，用于修改文章跳转到首页后，滚动条滚动到被修改文章位置 -->
	<view class="home" :class="`c${article._id}`">
		<view class="top">
			<view class="left">
				<img :src="article.user_id[0].avatar_file?article.user_id[0].avatar_file.url:'../../static/images/user-default.jpg'"
					alt="头像" class="avtar">
				<view class="username">{{article.user_id[0].nickname||article.user_id[0].username}}</view>
				<view class="time">
					<uni-dateformat :date="article.publish_date" :threshold="[60000,3600000]"></uni-dateformat>
				</view>
			</view>
			<view class="right" @click="gotooption">
				<text class="iconfont icon-shenglvehao"></text>
			</view>
		</view>
		<view class="middle">
			<view class="title" @click="gotodetail">{{article.title}}</view>
			<view class="content" @click="gotodetail" v-if="article.desc">
				{{article.desc}}
			</view>
			<view class="pic" v-if="article.picture.length">
				<image :src="item" alt="图片" class="avtar" mode="scaleToFill" v-for="(item,index) in article.picture"
					:key="index" @click="onimage(index)">
			</view>
		</view>
		<view class="bottom">
			<view>
				<text class="iconfont icon-chakan"></text>
				<text class="content">{{article.view_count}}</text>
			</view>
			<view @click="gotodetail">
				<text class="iconfont icon-pinglun"></text>
				<text class="content">{{article.comment_count>0?article.comment_count:'评论'}}</text>
			</view>
			<view class="like" :class="{active:isliked}" @click="onlike">
				<text class="iconfont icon-dianzan"></text>
				<text class="content">{{article.like_count>0?article.like_count:'点赞'}} </text>
			</view>
		</view>
		<u-action-sheet :actions="list" :show="show" @close="onclose" cancel-text="取消"
			@select="onselect"></u-action-sheet>
	</view>
</template>

<script>
	const db = uniCloud.database()
	export default {
		name: "blog-item",
		data() {
			return {
				list: [{
						name: '修改',
						color: '#ffaa7f',
						disabled: true
					},
					{
						name: '删除',
						disabled: true,
						color: '#f56c6c',
					},
				],
				show: false

			};
		},
		computed: {
			isliked() {
				return this.likedByCurrentUser.includes(this.article._id)
			}
		},
		props: ['article', 'likedByCurrentUser'],
		methods: {
			// 点击图片
			onimage(index) {
				uni.previewImage({
					urls: this.article.picture,
					current: index,
					loop: true
				})
			},
			gotodetail() {
				uni.navigateTo({
					url: `/pages/detail/detail?id=${this.article._id}`
				})
			},
			//点击省略号
			gotooption() {
				this.show = true
				let uid = uniCloud.getCurrentUserInfo().uid
				let roles = uniCloud.getCurrentUserInfo().role
				if (uid == this.article.user_id[0]._id || roles.includes('admin') || roles.includes('webmaster')) {
					this.list[0].disabled = false
					this.list[1].disabled = false
				}
			},
			// 删除新闻
			deleteArt() {
				uni.showLoading({
					title: "删除中"
				})
				db.collection("quanzi_article").doc(this.article._id).update({
					delState: true
				}).then(() => {
					uni.hideLoading()
					uni.showToast({
						title: '删除成功'
					})
					this.$emit('delevent')
				})
			},
			// 编辑新闻
			editArt(){
				uni.navigateTo({
					url:`/pages/edit/edit?id=${this.article._id}`
				})
			},
			onclose() {
				this.show = false
			},
			onselect(e) {
				this.show = false
				if (e.name === this.list[0].name) {
					//编辑新闻的回调
					this.editArt()

				} else if (e.name === this.list[1].name) {
					//删除新闻的回调
					this.deleteArt()
				}
			},
			// 点赞操作
			onlike() {
				this.$emit('beliked', this.article._id)

			}
		}
	}
</script>

<style lang="scss" scoped>
	.home {
		background-color: white;
		padding: 30rpx;

		.top {
			display: flex;
			justify-content: space-between;
			font-size: 28rpx;

			.left {
				display: flex;
				align-items: center;

				.avtar {
					width: 50rpx;
					height: 50rpx;
					border-radius: 50%;

				}

				.username {
					margin: 0rpx 10rpx;
				}

				.time {
					color: $uni-text-color-grey;
					font-size: 20rpx
				}
			}

			.right {
				display: flex;
				width: 52rpx;
				height: 52rpx;
				justify-content: center;
				align-items: center;
				font-size: 24rpx;
			}
		}

		.middle {
			.title {
				font-size: 40rpx;
				font-weight: bold;
				margin-bottom: 12rpx;

			}

			.content {
				color: $uni-text-color-grey;
				font-size: 20rpx;
				word-break: break-all;
				text-overflow: ellipsis;
				display: -webkit-box;
				-webkit-box-orient: vertical;
				-webkit-line-clamp: 2;
				/* 超出几行省略 */
				overflow: hidden;

			}

			.pic {
				display: flex;
				margin: 10rpx 0;

				image {
					display: block;
					width: 33%;
					height: 221rpx;

					&:first-child {
						border-radius: 20rpx 0 0 20rpx;
					}

					&:nth-child(2) {
						margin: 0 4rpx;
					}

					&:last-child {
						border-radius: 0 20rpx 20rpx 0;
					}

					&:only-child {
						border-radius: 20rpx;
					}
				}
			}
		}

		.bottom {
			margin-top: 30rpx;
			display: flex;
			justify-content: space-around;
			color: $uni-text-color-grey;
			font-size: 20rpx;

			view {
				display: flex;
				align-items: center;

				.content {
					margin-left: 10rpx;
				}
			}

			.like {
				&.active {
					.iconfont {
						color: royalblue;
					}

				}

			}

		}
	}
</style>