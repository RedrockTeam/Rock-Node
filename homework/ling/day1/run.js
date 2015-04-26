var http = require('http'),
	fs = require('fs'),
	events = require('events'),
	util = require('util');

var getURL = function(n){
		n = n || 1;
		return 'http://www.51voa.com/VOA_Standard_' + n + '.html';
	},
	BASEURL = 'http://www.51voa.com',
	resultDir = __dirname + '/result',
	nowPage = 1,
	maxPage = 92;

function Emitter(){
	events.EventEmitter.call(this);
}
util.inherits(Emitter, events.EventEmitter);
var e = new Emitter();

function initDir(dir){
	try{
		fs.readdirSync(dir);
	}catch(e){
		if(e.errno == -2){
			fs.mkdirSync(dir);
		}
	}
}

function run(page){
	page = page || nowPage;
	console.log("============================");
	console.log("============================");
	console.log("=====开始抓第", page, "页=====");
	http.get(getURL(page), function (res) {
		var contentHtml = new Buffer([]);
		res.on('data', function(chunk) {
			contentHtml += chunk;
		});
		res.on('end', function() {
			e.emit('finishGetHome', contentHtml);
		});
	});
}


e.on('finishGetHome', function (html) {
	var ret = html.match(/<a href=\"\/VOA_Standard_English\/.[^"]+?\"/g);
	ret = ret.slice(2);
	ret.forEach(function(_u){
		_u = _u.match(/"(.*)"/);
		var url = _u && _u[1];
		if(url){
			http.get(BASEURL + url, function(res){
				var _cont = new Buffer([]);
				res.on('data', function(chunk) {
					_cont += chunk;
				});
				res.on('end', function() {
					e.emit('finishGetChild', _cont);
				});
			});
		}
	});
});

e.on('finishGetChild', function (article){
	var ret = article.match(/<p>(.*?)<\/p>/ig);
	ret = "    " + ret.map(function (para) {
		return para.replace(/<[\/\w]+>/gi, '');
	}).join("\n    ");

	var nameMatch = article.match(/<div id="title">(.+)<\/div>/i);
	var articleName = nameMatch && nameMatch[1] || "NoName";
	e.emit('writeArticle', articleName, ret);

	var mp3UrlMatch = article.match(/<a id="mp3" href="(.+)" title/i);
	var mp3Url = mp3UrlMatch && mp3UrlMatch[1];
	e.emit('getMp3', articleName, mp3Url);
});

e.on('writeArticle', function(name, ret) {
	initDir(resultDir); //init result dir

	var filename = name + '.txt';
	console.log('正在写文件' + filename + '...');

	var articleDir = resultDir + '/' + name;
	initDir(articleDir);//init article dir

	fs.appendFileSync(articleDir + '/' + filename, ret);
});

e.on('getMp3', function(name, mp3Url) {
	initDir(resultDir); //init result dir

	var filename = name + '.mp3';
	console.log('正在写文件' + filename + '...');

	var articleDir = resultDir + '/' + name;
	initDir(articleDir);//init article dir

	http.get(mp3Url, function(res) {
		res.pipe(fs.createWriteStream(articleDir + '/' + filename));
	});
});


//------------- main ---------------
if(!process.argv[2]){
	console.log("VOA Catcher by Ling. v1.0");
	console.log("usage: node run {page}:", "page refers to the page you need to catch.{1, 92}.");
	process.exit(0);
}
var p = parseInt(process.argv[2]);
if(!p){
	console.log("invalid page.");
	process.exit(-1);
}
if(p > maxPage){
	console.log("invalid page. max to", maxPage);
	process.exit(-2);
}

run(p);