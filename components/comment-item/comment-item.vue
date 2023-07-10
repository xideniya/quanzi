<template>
	<view class="comment-item" @click="goReply">
		<view class="avatar">
			<u-avatar :src="comment.user_id[0].avatar_file ? comment.user_id[0].avatar_file.url : '../../static/images/user-default.jpg'" size="26"></u-avatar>
		</view>
		<view class="wrap">
			<view class="username">
				<view>{{ comment.user_id[0].nickname || comment.user_id[0].username }}</view>
				<view @click.stop="onDel" v-if="(comment.comment_type === 0 && goReplyFlag) || comment.comment_type === 1">
					<uni-icons type="closeempty" size="15"></uni-icons>
				</view>
			</view>
			<view class="comment-content">{{ comment.comment_content }}</view>
			<view class="info" v-if="comment.comment_type === 0">
				<view class="reply-btn">{{ comment.replyNumLv2 }}回复</view>
				<view>
					<uni-dateformat :date="comment.comment_date" :threshold="[60000, 3600000 * 24 * 30]"></uni-dateformat>
				</view>
				<view>{{ comment.province }}</view>
			</view>
		</view>
	</view>
</template>

<script>
const db = uniCloud.database();
const toolObj = uniCloud.importObject('toolObj', { customUI: true });
export default {
	name: 'comment-item',
	data() {
		return {};
	},
	props: {
		comment: {
			type: Object
		},
		goReplyFlag: {
			type: Boolean,
			default: true
		}
	},
	methods: {
		//删除评论
		onDel() {
			const { uid, role } = uniCloud.getCurrentUserInfo();
			if (uid == this.comment.user_id[0]._id || role.includes('admin') || role.includes('webmaster')) {
				uni.showModal({
					title: '是否删除本条评论？',
					success: async (e) => {
						if (e.confirm) {
							await db.collection('quanzi_comment').doc(this.comment._id).remove();
							toolObj.operation('quanzi_article', 'comment_count', this.comment.article_id, -1);
							if (this.comment.comment_type === 0) {
								//删除对应的二级评论
								let res = await db.collection('quanzi_comment').where({ reply_comment_id: this.comment._id }).count();
								toolObj.operation('quanzi_article', 'comment_count', this.comment.article_id, -res.result.total);
								await db.collection('quanzi_comment').where({ reply_comment_id: this.comment._id }).remove();
							}
							uni.showToast({
								title: '删除评论成功'
							});
							this.$emit('comDelete');
						}
					}
				});
			} else {
				uni.showToast({
					title: '无删除权限',
					icon: 'error'
				});
			}
		},
		// 跳转到回复
		goReply() {
			//如果是二级回复或者在回复页面无需跳转
			if (this.comment.comment_type === 1 || this.goReplyFlag === false) {
				return;
			}
			uni.setStorageSync('comment', this.comment);
			uni.navigateTo({
				url: '/pages/reply/reply'
			});
		}
	}
};
</script>

<style lang="scss" scoped>
.comment-item {
	display: flex;

	.wrap {
		flex: 1;
		padding-left: 20rpx;
		padding-bottom: 20rpx;

		.username {
			font-size: 26rpx;
			color: #666;
			padding: 10rpx 0;
			display: flex;
			justify-content: space-between;
			align-items: center;
		}

		.comment-content {
			font-size: 30rpx;
			color: #111;
			line-height: 1.8em;
		}

		.info {
			font-size: 26rpx;
			color: #666;
			display: flex;
			padding: 10rpx 0;
			align-items: center;

			view {
				margin-right: 25rpx;
			}

			.reply-btn {
				padding: 6rpx 18rpx;
				background: #e4e4e4;
				border-radius: 30rpx;
			}
		}
	}
}
</style>
