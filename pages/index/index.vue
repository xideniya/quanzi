<template>
	<view class="home">
		<!-- 顶部导航 -->
		<u-tabs
			:list="list1"
			@click="clickCb"
			:activeStyle="{
				color: '#303133',
				fontWeight: 'bold',
				transform: 'scale(1.05)'
			}"
			:inactiveStyle="{
				color: '#606266',
				transform: 'scale(1)'
			}"
			itemStyle="padding-left: 15px; padding-right: 15px; height: 34px;"
		></u-tabs>
		<!-- 内容区域 -->
		<view class="skeleton" v-show="loading">
			<u-skeleton rows="3" title></u-skeleton>
		</view>
		<view class="content" v-show="!loading">
			<view v-for="item in articleList" :key="item._id">
				<blog-item :article="item" @delevent="P_delevent" :likedByCurrentUser="likedByCurrentUser" @beliked="onbeliked"></blog-item>
			</view>
		</view>
		<uni-load-more :status="status"></uni-load-more>
		<!-- 编辑按钮 -->
		<view class="edit" @click="gotoEdit">
			<text class="iconfont icon-bianji"></text>
		</view>
	</view>
</template>

<script>
import { store } from '@/uni_modules/uni-id-pages/common/store.js';
const toolObj = uniCloud.importObject('toolObj', {
	customUI: true
});
const db = uniCloud.database();
const cmd = db.command;
export default {
	data() {
		return {
			loading: true,
			articleList: [],
			list1: [
				{
					name: '最新'
				},
				{
					name: '热门'
				}
			],
			order: 'publish_date',
			likedByCurrentUser: [], //当前用户点过赞的文章ID数组
			time: 0,
			status: 'more',
			total: 0,
			size: 4
		};
	},
	onLoad(e) {
		this.articleList = [];
		this.getarticleList();
		this.gettotal();
		uni.$on('editevent', this.onEditEvent);
	},
	// 触底加载更多数据
	onReachBottom() {
		// 防止多次触发
		if (this.status === 'loading') {
			return;
		}
		//数据获取完毕，跳出
		if (this.articleList.length >= this.total) {
			this.status = 'noMore';
			return;
		}
		this.status = 'loading';
		this.getarticleList();
	},
	methods: {
		//监听edit页面进行文章修改
		onEditEvent(e) {
			// 数据无感修改
			let art = this.articleList.find((item) => item._id == e._id);
			Object.assign(art, e);
			// 滚动条滚动到被修改文章位置
			this.$nextTick(() => {
				uni.pageScrollTo({
					selector: `.c${e._id}`,
					duration: 500
				});
			});
		},
		//切换热门，最新
		clickCb(e) {
			this.articleList = [];
			this.status = 'more';
			switch (e.name) {
				case '最新':
					this.order = 'publish_date';
					this.loading = true;
					this.getarticleList();
					break;
				case '热门':
					this.order = 'view_count';
					this.loading = true;
					this.getarticleList();
					break;
			}
		},
		// 跳转到编辑
		gotoEdit() {
			uni.navigateTo({
				url: '/pages/edit/edit'
			});
		},
		// 获取数据，连表查询
		getarticleList() {
			let arttemp = db
				.collection('quanzi_article')
				.where({
					delState: false
				})
				.field('title,user_id,desc,picture,comment_count,like_count,view_count,publish_date')
				.getTemp();
			let usertemp = db.collection('uni-id-users').field('_id,username,nickname,avatar_file').getTemp();
			db.collection(arttemp, usertemp)
				.orderBy(this.order, 'desc')
				.skip(this.articleList.length)
				.limit(this.size)
				.get()
				.then((res) => {
					this.articleList = [...this.articleList, ...res.result.data];
					this.loading = false;
					this.status = 'more';
					// 登录后判断点赞高亮
					if (store.hasLogin) {
						let arr = this.articleList.map((item) => {
							return item._id;
						});
						db.collection('quanzi_like')
							.where({
								article_id: cmd.in(arr),
								user_id: db.getCloudEnv('$cloudEnv_uid')
							})
							.field('_id,article_id')
							.get()
							.then((res) => {
								this.likedByCurrentUser = res.result.data.map((item) => {
									return item.article_id;
								});
							});
					}
				});
		},
		//删除文章回调
		P_delevent() {
			this.articleList = [];
			this.getarticleList();
		},
		//点赞回调
		async onbeliked(id) {
			// 未登录用户无法点赞
			if (!store.hasLogin) {
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
			//规避频繁操作
			if (Date.now() - this.time < 1000) {
				return;
			}
			this.time = Date.now();
			// 已经点赞的情况下取消点赞
			if (this.likedByCurrentUser.includes(id)) {
				// 无感操作
				let index = this.likedByCurrentUser.indexOf(id);
				this.likedByCurrentUser.splice(index, 1);
				let art = this.articleList.find((item) => {
					return item._id === id;
				});
				art.like_count--;
				// 数据库修改
				await db
					.collection('quanzi_like')
					.where({
						article_id: id,
						user_id: db.getCloudEnv('$cloudEnv_uid')
					})
					.remove();
				toolObj.operation('quanzi_article', 'like_count', id, -1);
			}
			// 没点赞进行点赞
			else {
				//无感操作
				this.likedByCurrentUser.push(id);
				let art = this.articleList.find((item) => {
					return item._id === id;
				});
				art.like_count++;
				//数据库修改
				await db.collection('quanzi_like').add({
					article_id: id
				});
				// 调用云对象里的函数
				toolObj.operation('quanzi_article', 'like_count', id, 1);
			}
		},
		// 获取文章总数
		async gettotal() {
			let res = await db
				.collection('quanzi_article')
				.where({
					delState: false
				})
				.count();
			this.total = res.result.total;
		}
	}
};
</script>

<style lang="scss" scoped>
.home {
	.edit {
		position: fixed;
		display: flex;
		justify-content: center;
		align-items: center;
		border-radius: 50%;
		width: 100rpx;
		height: 100rpx;
		bottom: 210rpx;
		right: 60rpx;
		z-index: 99;
		background-color: deepskyblue;

		.iconfont {
			font-size: 60rpx;
			color: white;
		}
	}

	.skeleton {
		padding: 30rpx;
	}

	.content {
		background-color: $uni-bg-color-grey;

		view {
			margin-bottom: 20rpx;
		}
	}
}
</style>
