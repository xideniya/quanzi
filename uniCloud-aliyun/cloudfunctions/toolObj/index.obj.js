const db = uniCloud.database()
const dbcmd = db.command
module.exports = {
	_before: function() { // 通用预处理器

	},
	/**
	 * @param {Object} table 数据表
	 * @param {Object} attr 属性
	 * @param {Object} id ID
	 * @param {Object} num 正数自增 负数自减
	 */
	async operation(table, attr, id, num) {
		return await db.collection(table).doc(id).update({
			[attr]: dbcmd.inc(num)
		})
	}
}