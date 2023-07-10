<template>
	<view>
		<view class="commentFrame">
			<uni-easyinput ref="uipt" @confirm="goComment" suffixIcon="paperplane" v-model="replyContent" :placeholder="placeholder" @iconClick="goComment"></uni-easyinput>
		</view>
	</view>
</template>
<script>
import { getProvince } from '../../utils/tool.js';
import { store } from '../../uni_modules/uni-id-pages/common/store.js';
const db = uniCloud.database();
const toolObj = uniCloud.importObject('toolObj', {
	customUI: true
});
export default {
	name: 'comment-frame',
	data() {
		return {
			replyContent: ''
		};
	},
	props: {
		articleId: {
			type: String
		},
		comment_type: {
			type: Number
		},
		placeholder: {
			type: String,
			default: '说点什么吧'
		},
		reply_user_id: {
			type: String
		},
		reply_comment_id: {
			type: String
		}
	},
	methods: {
		async goComment() {
			if (this.replyContent == '') {
				return;
			}
			//获取省份
			let res = await getProvince();
			// 发表评论
			let res2 = await db.collection('quanzi_comment').add({
				article_id: this.articleId,
				user_id: db.getCloudEnv('$cloudEnv_uid'),
				comment_content: this.replyContent,
				comment_type: this.comment_type,
				province: res,
				reply_user_id: this.reply_user_id,
				reply_comment_id: this.reply_comment_id
			});
			// 无感操作，向父组件传递数据
			this.$emit('newid', {
				_id: res2.result.id,
				article_id: this.articleId,
				comment_content: this.replyContent,
				comment_type: this.comment_type,
				province: res,
				user_id: [
					{
						...store.userInfo
					}
				],
				//模拟一个时间
				comment_date: Date.now()
			});
			//云函数修改评论数，关闭load
			toolObj.operation('quanzi_article', 'comment_count', this.articleId, 1);
			uni.showToast({
				title: '发表评论成功',
				duration: 1550
			});
			this.replyContent = '';
		}
	}
};
</script>

<style lang="scss" scoped>
.commentFrame {
	width: 100%;
	background: #fff;
	padding: 20rpx 30rpx;
	box-sizing: border-box;
	position: fixed;
	bottom: 0;
	left: 0;
	z-index: 100;
}
</style>
