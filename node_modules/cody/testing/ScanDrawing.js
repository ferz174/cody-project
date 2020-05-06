
console.log("loading " + module.id);

var cody = require("../index.js");
var db_scan_table = "scan_drawings"

function ScanDrawing(basis) {
	for (var a in basis)
	{
		if (basis.hasOwnProperty(a)) this[a] = basis[a];
	}
	this.id = this.id || 0;
	this.item = this.item || "";
	this.detect = this.detect || "";
	this.name = this.name || "";
	this.parent = this.parent || "";
	this.scandate = this.scandate || 0;
}

module.exports = ScanDrawing;

//Функции без прототипа
//Вставка новой записи
ScanDrawing.NewScanDrawing = function(controller, data, finish) {
	controller.resetConnection(controller.app).query("insert into "+db_scan_table+" (item) values "+(cody.config.dbsql == "pg" ? '($1)' : '(?)'),
	[data],
	function(error, result) {
		if (error) throw new Error("ScanDrawing.NewScanDrawing sql error: "+error);
		finish((result.rows ? result.rows : result).insertId);
    });
};

//Обновление записей из асинхронных функций
ScanDrawing.SetScanDrawing = function(controller, data, id, finish) {
	var ApplyOut = "";
	if (cody.config.dbsql == "pg") {
		for (var i in id)
		{
			ApplyOut = i;
		}
		id = id[ApplyOut];
	}
	
	controller.resetConnection(controller.app).query("update "+db_scan_table+" set "+(cody.config.dbsql == "pg" ? 'name = $1, parent = $2 where '+ApplyOut+' = $3': 'name = ?, parent = ? where id = ?'),
	[data.name, data.parent, id],
	function(error) {
		if (error) throw new Error("ScanDrawing.SetScanDrawing sql error: "+error);
	});
};

ScanDrawing.SetScanDrawingData = function(controller, data, finish) {
	var store = finish;
	controller.resetConnection(controller.app).query(data,
	function(error) {
		if (error) throw(new Error("SetScanDrawingData: "+ error));
		store(result.rows ? result.rows : result);
	});
};

//Получение сканируемого чертежа
ScanDrawing.GetScanDrawing = function(controller, data, finish) {
	var store = finish;
	controller.resetConnection(controller.app).query("select * from "+db_scan_table+" where "+(cody.config.dbsql == "pg" ? 'item = $1' : 'item = ?'),
	[data.item],
	function(error, result) {
		if (error) throw(new Error("ScanDrawing.GetScanDrawing sql errors: "+error));
		store((result.rows ? result.rows : result)[0] ? new cody.ScanDrawing((result.rows ? result.rows : result)[0]) : false);
	});
};

ScanDrawing.GetScanDrawings = function(controller, data, finish) {
	var store = finish;
	controller.query("select date_format(scandate,'%d.%m.%Y') Date, date_format(scandate,'%H:%i:%s') Time, parent Project, name FileName, item File from "+db_scan_table+" where "+(cody.config.dbsql == "pg" ? 'scandate > $1' : 'scandate > ?')+" and scandate < adddate("+(cody.config.dbsql == "pg" ? '$1' : '?')+", interval 1 day)",
	[data, data],
	function(error, result) {
		if (error) throw(new Error("ScanDrawing.GetScanDrawings sql errors: "+error));
		store(result.rows ? result.rows : result);
	});
};

//Получение чертеже которые не перемещены в сводку т.е. поле name null
ScanDrawing.GetScanDrawingsNotName = function(controller, data, finish) {
	var store = finish;
	controller.resetConnection(controller.app).query("select * from "+db_scan_table+" as scantable where "+(cody.config.dbsql == "pg" ? '($1 ~ scantable.detect or scantable.item = $2)' : '(? regexp scantable.detect or scantable.item = ?)')+" and (scantable.name is null or scantable.name='') order by scantable.scandate desc",
	[data, data],
	function(error, result) {
		if (error) {
			throw(new Error("ScanDrawing.GetScanDrawingsNotName sql errors: "+error));
			store([{"false" : error}]);
		}
		store((result.rows ? result.rows : result).length ? (result.rows ? result.rows : result) : [{"false" : ""}]);
  });
};