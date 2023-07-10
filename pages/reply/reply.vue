<template>
	<view>
		<view class="top">
			<comment-item :comment="comment" :goReplyFlag="false"></comment-item>
		</view>
		<view class="list">
			<view v-for="item in comListLv2" :key="item._id">
				<comment-item :comment="item" @comDelete="onComDelete"></comment-item>
			</view>
		</view>
		<comment-frame
			:placeholder="`回复@${comment.user_id[0].nickname}`"
			:comment_type="1"
			:articleId="comment.article_id"
			:reply_user_id="comment.user_id[0]._id"
			:reply_comment_id="comment._id"
			@newid="onNewid"
		></comment-frame>
	</view>
</template>

<script>
const db = uniCloud.database();
export default {
	data() {
		return {
			comment: {},
			comment_type: 1,
			comListLv2: []
		};
	},
	onLoad() {
		const value = uni.getStorageSync('comment');
		this.comment = value;
		this.getComment();
	},
	onUnload() {
		uni.removeStorageSync('comment');
	},
	methods: {
		async getComment() {
			let comtemp = db
				.collection('quanzi_comment')
				.where({
					article_id: this.comment.articleId,
					comment_type: 1,
					reply_comment_id: this.comment._id
				})
				.orderBy('comment_date', 'desc')
				.limit(20)
				.getTemp();
			let usertemp = db.collection('uni-id-users').field('_id,username,nickname,avatar_file ').getTemp();
			let res = await db.collection(comtemp, usertemp).get();
			this.comListLv2 = res.result.data;
		},
		onNewid(e) {
			this.comListLv2.unshift(e);
			this.comment.replyNumLv2++;
		},
		onComDelete() {
			this.getComment();
		}
	}
};
</script>

<style lang="scss" scoped>
.top {
	padding: 30rpx;
	border-bottom: 15rpx solid #eee;
}
.list {
	padding: 30rpx 30rpx 120rpx 120rpx;
}
</style>
