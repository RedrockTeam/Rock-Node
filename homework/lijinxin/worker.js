var http = require('http'),
       fs = require('fs'),
       d = require('domain').create(),
       path = require('path'),
       util = require('util'),
       evm = require('events').EventEmitter;

 function Ev(){
 	evm.call(this);
 }
 util.inherits(Ev, evm);
 var e = new Ev();       

var index, links = [];
d.on('error', function(err){
	process.send({'success' : false, 'index' : index});
	//todo
	console.log(err.stack );
});

 process.on('message', function(message){
 	console.log('当前处理第', message.index, '页');
 	index = message.index;
 	d.run(function(){
 		http.get('http://www.51voa.com/VOA_Standard_'+ index +'.html', function(res){
			var buf = [], size = 0;
			res.on('data', function(chunk){
				buf.push(chunk);
				size += chunk.length;
			});
			res.on('end', function(){
				console.log('请求列表页成功!!');
				var reg = /<a href=\"(\/VOA_Standard_English\/[^\/]+\.html)\"/ig, piece;
				buf = Buffer.concat(buf, size).toString();
				while( piece = reg.exec(buf) ){
					links.push(piece[1]);
				}
				console.log('下面进行解析！！！');
				e.emit('parse');
			});
		});
	 });
 });

 e.on('parse', function(){
 	console.log('开始解析!!');
 	var p = links.shift();
 	if(p){
 		 http.get('http://www.51voa.com/' + p, function(res){
 		 	var buf = [], size = 0, name = p.slice( p.lastIndexOf('/') +1 );
 		 	res.on('data', function(chunk){
		           	buf.push(chunk);
		           	size += chunk.length;
	          	 	});
 		 	res.on('end', function(){
 		 		console.log('资源正在获取!!!');
 		 		buf = Buffer.concat(buf, size);
 		 		var regM = /href=\"([\S]+.mp3)\"/i;
 		 		var mp3 = regM.exec(buf)[1];
 		 		var regC = /<div id="content">[\s\S]*<\/P><\/div>/i;
 		 		var content = regC.exec(buf)[0].replace(/<(\/)?(div|p)[^>]*>/ig, '\n'); //块
 		 		content = content.replace(/<(\/)?(span|strong|img|br|i)[^>]*>/gi, ''); //行内
 		 		e.emit('save', mp3, content, name);
 		 	});
 		 });
 	}else{
 		process.send({success : true});
 	}
 });

e.on('save', function(mp3, content, name){
	console.log('开始保存资源!');
	var count = 0, dir = path.join(__dirname, 'data', name), filename = path.join(dir, name);
	console.log(name);
	if( !fs.existsSync(dir) ){
		fs.mkdirSync(dir);
	}

	http.get(mp3, function(res){
			var wms = fs.createWriteStream(  filename + '.mp3', {flag : 'w'});
			res.pipe(wms);
			res.on('end', function(){
				if(++count == 2) e.emit('parse');
			});
	});
	//异步同时保存
	var wcs = fs.createWriteStream(filename+'.txt', {flag: 'w'});
	wcs.end(content, function(){
		if(++count == 2) e.emit('parse');
	});
});