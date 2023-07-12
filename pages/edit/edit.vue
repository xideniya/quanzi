<template>
	<view class="home">
		<view class="title">
			<input type="text" placeholder="输入新闻标题" v-model="artobj.title" />
		</view>
		<view class="content">
			<editor
				placeholder="输入新闻内容"
				show-img-resize
				show-img-size
				show-img-toolbar
				@focus="editorFocus"
				@ready="onready"
				id="editor"
				@statuschange="onstatuschange"
			></editor>
		</view>
		<u-button type="primary" text="确定" :disabled="!artobj.title.trim().length" @click="onconfirm"></u-button>
		<view class="tool" v-if="showTool">
			<view class="tool-item" @click="charutupian">
				<text class="iconfont icon-charutupian"></text>
			</view>
			<view class="tool-item" @click="zitijiacu">
				<text class="iconfont icon-zitijiacu" :class="{ active: highlight.jiacu }"></text>
			</view>
			<view class="tool-item" @click="zitixieti">
				<text class="iconfont icon-zitixieti" :class="{ active: highlight.zitixieti }"></text>
			</view>
			<view class="tool-item" @click="zitibiaoti">
				<text class="iconfont icon-zitibiaoti" :class="{ active: highlight.zitibiaoti }"></text>
			</view>
			<view class="tool-item" @click="fengexian">
				<text class="iconfont icon-fengexian"></text>
			</view>
			<view class="tool-item" @click="duigoux">
				<text class="iconfont icon-duigoux"></text>
			</view>
		</view>
	</view>
</template>

<script>
import { getImgSrc, getProvince } from '@/utils/tool.js';
import { v4 as uuidv4 } from 'uuid';
const db = uniCloud.database();
export default {
	data() {
		return {
			showTool: false,
			editorContext: {},
			highlight: {
				zitibiaoti: false,
				jiacu: false,
				zitixieti: false
			},
			artobj: {
				title: '',
				content: '',
				desc: '',
				picture: '',
				province: ''
			},
			articleId: ''
		};
	},
	onLoad(e) {
		if (e.id) {
			this.articleId = e.id;
			uni.setNavigationBarTitle({
				title: '修改文章'
			});
		}
		getProvince().then((res) => {
			this.artobj.province = res;
		});
	},
	methods: {
		// 获取焦点
		editorFocus() {
			this.showTool = true;
		},
		//富文本编辑器初始化（这是回调不是生命周期）
		onready() {
			uni.createSelectorQuery()
				.in(this)
				.select('#editor')
				.fields(
					{
						size: true,
						context: true
					},
					(res) => {
						this.editorContext = res.context;
						//获取编辑器上下文后，数据回填
						this.editArticle();
					}
				)
				.exec();
		},
		//被编辑文章数据回填
		async editArticle() {
			let res = await db.collection('quanzi_article').doc(this.articleId).get();
			this.editorContext.setContents({
				html: res.result.data[0].content
			});
			this.artobj.title = res.result.data[0].title;
		},
		//分割线
		fengexian() {
			this.editorContext.insertDivider();
		},
		// 标题
		zitibiaoti() {
			this.highlight.zitibiaoti = !this.highlight.zitibiaoti;
			this.editorContext.format('header', this.highlight.zitibiaoti ? 'h2' : false);
		},
		//字体加粗
		zitijiacu() {
			this.highlight.jiacu = !this.highlight.jiacu;
			this.editorContext.format('bold');
		},
		// 字体斜体
		zitixieti() {
			this.highlight.zitixieti = !this.highlight.zitixieti;
			this.editorContext.format('italic');
		},
		// 对钩
		duigoux() {
			this.showTool = false;
		},
		//插入图片
		charutupian() {
			uni.chooseImage({
				success: async (res) => {
					uni.showLoading({
						title: '上传中',
						mask: true
					});
					for (let item of res.tempFiles) {
						let suffix = item.path.substring(item.path.lastIndexOf('.'));
						let cusName = uuidv4() + suffix;
						let res = await uniCloud.uploadFile({
							filePath: item.path,
							cloudPath: item.name || cusName
						});
						this.editorContext.insertImage({
							src: res.fileID
						});
					}
					uni.hideLoading();
				}
			});
		},
		//样式发生改变触发
		onstatuschange(e) {
			if (!e.detail.hasOwnProperty('header')) {
				this.highlight.zitibiaoti = false;
			}
		},
		// 确认按钮
		onconfirm() {
			this.editorContext.getContents({
				success: (res) => {
					this.artobj.desc = res.text.slice(0, 50);
					this.artobj.content = res.html;
					this.artobj.picture = getImgSrc(res.html);
					uni.showLoading({
						title: '发布中',
						mask: true
					});
					if (this.articleId) {
						// 修改文章
						this.editData();
					} else {
						// 发布文章
						this.addData();
					}
				}
			});
		},
		// 发布新文章
		addData() {
			db.collection('quanzi_article')
				.add({
					...this.artobj
				})
				.then((res) => {
					uni.hideLoading();
					uni.showToast({
						title: '发布成功'
					});
					setTimeout(() => {
						uni.reLaunch({
							url: '/pages/index/index'
						});
					}, 800);
				});
		},
		//修改文章
		editData() {
			db.collection('quanzi_article')
				.doc(this.articleId)
				.update({ ...this.artobj })
				.then((res) => {
					uni.hideLoading();
					uni.showToast({
						title: '修改成功'
					});
					setTimeout(() => {
						uni.switchTab({
							url: '/pages/index/index'
						});
						// 与index通信,传递的数据用于数据无感修改,触发滚动条滚动到修改的文章的位置
						uni.$emit('editevent', { _id: this.articleId, ...this.artobj });
					}, 800);
				});
		}
	}
};
</script>

<style lang="scss" scoped>
.home {
	padding: 20rpx;

	.title {
		margin-bottom: 20rpx;

		input {
			border-bottom: 2rpx solid darkgray;
			height: 120rpx;
		}
	}

	.content {
		height: calc(100vh - 450rpx);

		.ql-container {
			min-height: 100%;
		}
	}

	.tool {
		width: 100%;
		position: fixed;
		left: 0;
		bottom: 0;
		margin-top: 10rpx;
		display: flex;
		align-items: center;
		justify-content: space-around;
		padding: 20rpx 0;
		border-top: 1px solid #f4f4f4;

		.tool-item {
			.iconfont {
				font-size: 36rpx;
			}

			.active {
				color: #0199fe;
			}
		}
	}
}
</style>
