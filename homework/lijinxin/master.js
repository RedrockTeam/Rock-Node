var c_p = require('child_process'),
       os = require('os'),
       path = require('path'),
       fs = require('fs'),
       d = require('domain').create();
  

d.on('error', function(err){
	console.log('there are an error!!!!');
	console.log(err.stack);
	//todo
});

d.run(function(){
	var args = [process.argv[3] || 1, process.argv[4]  || 91];
	if(args[0] > args[1]) args.reverse();
	var index = args[0];
	var errors = []; // 出错的序号
	var dir = path.join(__dirname, 'data');
	if( !( fs.existsSync(dir) && fs.statSync(dir).isDirectory() ) ){
		fs.mkdir(dir);
	}

	os.cpus().forEach(function(){
		var worker = c_p.fork( path.join(__dirname, 'worker.js') );
		worker.on('message', function(res){
			if( res.success){
				if(index > 0 && index++ <= arg[1])
					worker.send({'index' : index});
				else if(errors.length > 0)
					worker.send({'index' : errors.shift()});

			}else{
				console.log('第', res.index, '个出现错误!!!!');
				erros.push(res.index);
			}
		});

		worker.send({'index' : index++});
	});
});







