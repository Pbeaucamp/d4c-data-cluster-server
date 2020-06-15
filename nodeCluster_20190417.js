#!/usr/bin nodejs

/* librairie de requete http, depend de si le ckan est ne https ou non*/
//var http = require('https');
var http = require('http');

var querystring = require('querystring');
var url = require('url');
var fs = require('fs');



/* chemin vers la lib de cluster */
var supercluster =require("/home/bpm/data/node_modules/supercluster/dist/supercluster.js");  
//var oboe = require('oboe');
var io = require('socket.io');
var auth = require("basic-auth");

var test = "test";

/* options http pour sécuriser le serveur node en https avec les certificats clients */
//const options = {
//  key: fs.readFileSync('/etc/nginx/ssl/****.key'),
//  cert: fs.readFileSync('/etc/nginx/ssl/****.cer')
//};

/* variable pour sécuriser par login mot de passe certaines routes node */
const admins = { 'system': { password: 'system' }, };
var host = "http://192.168.2.223";  // attention si serveur NOde en https (= options décommenté), host ne doit pas contenir le protocole http:// ou https://

/* instanciation du seveur nodeJs */
var server = http.createServer(/*options,*/ function (req, res) { //décommenter la variable options pour https
	var url_parts = url.parse(req.url, true);
    if(url_parts.query.length != 0){
		if (req.method == 'GET') {
			console.log(url_parts.pathname); 
			switch (url_parts.pathname) {
				case '/cluster':
					try{
						var zoom = url_parts.query.zoom.toString();
						var minLat = url_parts.query.minLat.toString();
						var maxLat = url_parts.query.maxLat.toString();
						var minLong = url_parts.query.minLong.toString();
						var maxLong = url_parts.query.maxLong.toString();
						var idRes = url_parts.query.idRes.toString();
						
						data = cluster(zoom, minLat, maxLat, minLong, maxLong, idRes);
						//console.log(data);
						res.writeHead(200, {'Content-Type': 'application/json'});
						res.end(JSON.stringify(data));
							
					  } catch(e){
						console.log(e);
						res.writeHead(500, {'Content-Type': 'text/html'});
						res.end("<p>Erreur lors de la génération du cluster : </p>" + e);

					}
				
				break;
				
				case '/precluster':
					var user = auth(req);
  					if (!user || !admins[user.name] || admins[user.name].password !== user.pass) {
						res.statusCode = 401
						res.setHeader('WWW-Authenticate', 'Basic realm="example"')
						res.end('Access denied')
  					} else {
						try{
							//var d = new Date();
							//var d2 = new Date(d.getTime() - 1000*60*10000);
							fs.readFile('preCluster.html', 'utf-8', function(error, content) {
        						res.writeHead(200, {"Content-Type": "text/html"});
        						res.end(content);
   							});
							if(!("id" in url_parts.query)){
								setTimeout(function(){io.sockets.emit("error", "La paramètre 'id' du jeu de données est manquant");}, 1000);
								return;
							}
							
							treatDatasets(res, url_parts.query.id.toString(), true, false);
							
							
						} catch(e){
							console.log(e);
							setTimeout(function(){io.sockets.emit("error", e);}, 1000);
						}
					}
				break;
				
				case '/socket':   //route de test pour le bon fonctionnement, serveur + authentification

					var user = auth(req);
  					if (!user || !admins[user.name] || admins[user.name].password !== user.pass) {
    						res.statusCode = 401
    						res.setHeader('WWW-Authenticate', 'Basic realm="example"')
    						res.end('Access denied')
  					} else {
						fs.readFile('preCluster.html', 'utf-8', function(error, content) {
							res.writeHead(200, {"Content-Type": "text/html"});
        					res.end(content);

							io.sockets.emit("log",'hello');
						});
						setTimeout(function(){io.sockets.emit("log", "message 2");}, 3000);
					}
						
				break;
			}
		}
		if (req.method == 'POST') {
			var body = '';
			req.on('error', function(err) {
				if(err) {
					response.writeHead(500, {'Content-Type': 'application/json'});
					response.write(err.message);
					response.end();
				}
			});
			req.on('data', function(chunk){
				body += chunk.toString();
			});
			req.on('end', function() {
				
				//console.log(body);
				
				switch (url_parts.pathname) {
								
					case '/precluster':
					
						try{
							/*var d = new Date();
							var d2 = new Date(d.getTime() - 1000*60*10000);
							http.get('/api/action/package_show?id='+url_parts.query.id.toString(), function(resp) {
							  var data = '';
							 
							  // A chunk of data has been recieved.
							  resp.on('data', function(chunk) {
								data += chunk;
							  });
							 
							  // The whole response has been received. Print out the result.
							  resp.on('end', function() {
								console.log(JSON.parse(data).result);
								treatDatasets(JSON.parse(data).result, d, d2, res);
							  });
							 
							}).on("error", function(err) {
							  console.log("Error: " + err.message);
							res.writeHead(200, {'Content-Type': 'application/json'});
							res.end("errorrr");

							});
							*/
							//console.log(Object.keys(body));console.log(body.idd);
							body = querystring.parse(body);
							if(body.id == undefined){
								res.writeHead(500, {'Content-Type': 'application/json; charset=utf-8'});
								res.end("La paramètre 'id' du jeu de données est manquant");
								return;
							}
							
							treatDatasets(res, body.id.toString(), false, true);	//url_parts.query.createJSON ?
							
						} catch(e){
							console.log(e);
							res.writeHead(500, {'Content-Type': 'application/json'});
							res.end(e.message);

						}
					
					break;
					case '/clusterDirect':
						body = JSON.parse(body);
						//console.log(body);
						var clusters = clusterDirect(body.zoom, body.data)
						res.writeHead(200, {'Content-Type': 'application/json'});
						res.end(JSON.stringify(clusters));
					break;
				}
				
			});
			

		}
		
    }
    
}).listen(1337, '0.0.0.0');  //port par défaut, peut être modifié

io = io.listen(server);

console.log('Server running at http://0.0.0.0:1337/');  //changer port si besoin

var cluster = function(zoom, minLat, maxLat, minLong, maxLong, idRes){
	console.log('getCluster('+zoom+', '+minLat+', '+maxLat+', '+minLong+', '+maxLong+', '+idRes+')');
	var index = supercluster({
		radius: 40,
		maxZoom: 16
	});
	var index2 = supercluster({
		radius: 0,
		maxZoom: 16
	});
	var resourcePath = "";
    var path = /*resourcePathZoom +*/ idRes + "_z" + zoom + ".geojson";
    var data;
    if (fs.existsSync(path)) {
        var contents = fs.readFileSync(path);console.log(path);
        var jsonContent = JSON.parse(contents);console.log(jsonContent.features.length);
        index2.load(jsonContent.features);console.log("index2.getClusters(["+minLong+", "+minLat+", "+maxLong+", "+maxLat+"], "+zoom+")");
        data = index2.getClusters([minLong, minLat, maxLong, maxLat], zoom);
	//data = index2.getClusters([minLat, minLong, maxLat, maxLong], zoom);console.log(JSON.stringify(data));
    } else {
        path = resourcePath + idRes;
        var contents = fs.readFileSync(path);
        var jsonContent = JSON.parse(contents);
        index.load(jsonContent.features);
        data = index.getClusters([minLong, minLat, maxLong, maxLat], zoom);
    }
    
    var obj = {
       type: "FeatureCollection"
    };
    obj.features = data;
    return obj;
}

treatDatasets = function(response, idDataset, createJSON, checkCSV){
		var post = checkCSV;
		/* si ckan en https*/
		var opt = {
			hostname: host,
			port: 443,
			path: '/api/action/package_show?id='+idDataset,
			method: 'GET',
			"rejectUnauthorized": false
		};
		//http.get(opt, function(resp) { //si ckan https
		http.get(host+'/api/action/package_show?id='+idDataset, function(resp) {  //si ckan http
			var data = '';
			if(!post) setTimeout(function(){io.sockets.emit("info", "Récupération des informations du jeu de données...");}, 1000);
			// A chunk of data has been recieved.
			resp.on('data', function(chunk) {
				data += chunk;
				if(!post) setTimeout(function(){io.sockets.emit("waiting", ".");}, 1000);
			});
			
			// The whole response has been received. Print out the result.
			resp.on('end', function() {
				var result = JSON.parse(data).result;
				var dname = result.name;
				console.log(dname);
				var csvfound = false;
				
				var geoFileExists = false; var dateGeoFile = null;
				geoFileExists = fs.existsSync(dname+'_z0.geojson') || fs.existsSync(dname+'.geojson');
				console.log(geoFileExists);
				if(geoFileExists){
					try{
						var stats = fs.statSync(dname+'_z0.geojson');
						dateGeoFile = new Date(stats.mtime);
					} catch(e){
						var stats = fs.statSync(dname+'.geojson');
						dateGeoFile = new Date(stats.mtime);
					}
					dateGeoFile.setHours(dateGeoFile.getHours()+1);
					console.log(dateGeoFile);// variation de 2h ??
				}
				
				
				//search csv
				for(var i=0; i<result.resources.length; i++){
					var res = result.resources[i];
					console.log(res.format);
					if(res.format == "CSV" || res.format == "XLS" || res.format == "XLSX"){
						csvfound = true;
						if(checkCSV){
							var lastModified;
							if(res.last_modified == "null"){
								lastModified = new Date(res.created);
							} else {
								lastModified = new Date(res.last_modified);
							}
							lastModified.setHours(lastModified.getHours()+2);
							console.log(lastModified);
							if(lastModified > dateGeoFile || dateGeoFile == null){
								//work on geojson
								workOnGeoJson(response, result, res, dateGeoFile, createJSON, post);
							} else {
								//TODO on recheck ?
								
							}
							
							break;
						} else {
							//work on geojson
							workOnGeoJson(response, result, res, dateGeoFile, createJSON, post);
							break;
						}
					}
				}
				if(!csvfound){
					console.log("Aucune ressource csv n'a été trouvée.");
					response.writeHead(500, {'Content-Type': 'application/json'});
					response.end("Aucune ressource csv ou tabuliare n'a été trouvée.");
				}
					
				
				
				
			});
		 
		}).on("error", function(err) {
			console.log("Error: " + err.message);
			if(!post) {
				setTimeout(function(){io.sockets.emit("error", err.message);}, 1000);
			} else {
				response.writeHead(500, {'Content-Type': 'application/json'});
				response.end(err.message);
			}
			
		});
}

workOnGeoJson = function(response, datasetJson, csvResourceJson, dateGeoFile, createJSON, post){
	//test geojson mise à jour
	var recentGeofound = false;var recentGeo = null;
	for(var i=0; i<datasetJson.resources.length; i++){
		var res = datasetJson.resources[i];
		console.log(res.format);
		if(res.format == "GeoJSON"){
			
			var lastModified;
			if(res.last_modified == "null"){
				lastModified = new Date(res.created);
			} else {
				lastModified = new Date(res.last_modified);
			}
			lastModified.setHours(lastModified.getHours()+2);
			console.log(lastModified);
			if(lastModified > dateGeoFile || dateGeoFile == null){
				recentGeofound = true;
				recentGeo = res;
				break;
			}
			
		}
	}
	
	
	if(recentGeofound){
		if(!post) io.sockets.emit("info", "Récupération de la ressource GeoJson...");
								
		/*var opt2 = {
			hostname: host,
			port: 443,
			path: recentGeo.url, //res.url.replace('https://data-backoffice.anfr.fr', ''),///dataset/dd11fac6-4531-4a27-9c8c-a3a9e4ec2107/resource/de93c1ff-55a4-48f3-adc5-a1887a86d77c/download/observatoire_2g_3g_4g-1.geojson',
			method: 'GET',
			"rejectUnauthorized": false
		};*/
//		http.get(opt2, function(resp) {
		http.get(recentGeo.url, function(resp) {
			var data = '';
			 
			resp.on('data', function(chunk) {
				data += chunk;
				if(!post) io.sockets.emit("waiting", ".");
			});
			 
			resp.on('end', function() {
				if(!post) io.sockets.emit("info", "Le fichier a été récupéré...");
				var jsonContent = JSON.parse(data);
				//console.log(data);
				console.log("file parsed");
				if(!post) io.sockets.emit("info", "Le fichier a été parsé...");
				if(!post) io.sockets.emit("info", "Clusterisation des données...");
				preCluster(jsonContent, datasetJson.name);
				if(!post){
					io.sockets.emit("success", "Traitement terminé avec succès !");
				} else {
					response.writeHead(200, {'Content-Type': 'application/json'});
					response.end("ok");
				}
			});
			 
		}).on("error", function(err) {
			console.log("Error: " + err.message);
			if(!post){
				io.sockets.emit("error", err.message);
			} else {
				response.writeHead(500, {'Content-Type': 'application/json'});
				response.end(err.message);
			}
			
			
		});
	} else {
		if(createJSON && csvResourceJson != null){
			var data = JSON.stringify({
			  id: csvResourceJson.id
			});
			var opt = {
				hostname: host,
				path: '/api/action/datastore_info',
				method: 'POST',
				port: 80, //443 si https
				headers: {
					'Content-Type': 'application/json',
					'Content-Length': data.length
				}
			};
			var req = http.request(opt, function(res) {
				console.log(`statusCode: ${res.statusCode}`);

				res.on('data', (d) => {
					//process.stdout.write(d);
					var fields = Object.keys(JSON.parse(d).result.schema);
					var fieldId = "id";var fieldCoord = "coordonnees";
					var idRegex = /id/;var coordRegex = /geo_point|coordin|coordon|geopoint|geoPoint|pav_positiont2d/;
					console.log(fields);
					if(!('id' in fields)){ 
						for(var i=0;i<fields.length;i++){
							if(idRegex.exec(fields[i]) != null){
								fieldId = fields[i];
								break;
							} 
						}
					}
					if(!('coordonnees' in fields)){ 
						for(var i=0;i<fields.length;i++){
							if(coordRegex.exec(fields[i]) != null){
								fieldCoord = fields[i];
								break;
							} 
						}
					}
					//create file
					if(!post) setTimeout(function(){io.sockets.emit("info", "Récupération de la ressource csv pour création geojson...");}, 1000);
										
					/*var opt2 = {
						hostname: host,
						port: 443,
						path: csvResourceJson.url, //res.url.replace('https://data-backoffice.anfr.fr', ''),///dataset/dd11fac6-4531-4a27-9c8c-a3a9e4ec2107/resource/de93c1ff-55a4-48f3-adc5-a1887a86d77c/download/observatoire_2g_3g_4g-1.geojson',
						method: 'GET',
						"rejectUnauthorized": false
					};*/
			//		http.get(opt2, function(resp) {
					http.get(csvResourceJson.url, function(resp) {
						var data = '';
						 
						resp.on('data', function(chunk) {
							data += chunk;
							if(!post) setTimeout(function(){io.sockets.emit("waiting", ".");}, 1000);
						});
						 
						resp.on('end', function() {
							if(!post) setTimeout(function(){io.sockets.emit("info", "Le fichier a été récupéré...");}, 1000);
							var name = datasetJson.name+'.'+csvResourceJson.format;
							fs.writeFile(name, data, 'utf8', function(err){if(err) throw err;});
							//console.log(data);
							console.log("file downloaded");
							const exec = require('child_process').exec;
							const childPorcess = exec('java -jar bpm.geojson.creator_0.0.1.jar -i "'+name+'" -o "'+ datasetJson.name +'.geojson" -id "'+fieldId+'" -coor "'+fieldCoord+'"', function(err, stdout, stderr) {
								if (err) {
									console.log(err)
									if(!post){
										setTimeout(function(){io.sockets.emit("error", err.message);}, 1000);
									} else {
										response.writeHead(500, {'Content-Type': 'application/json'});
										response.end(err.message);
									}
								} else {
									var contents = fs.readFileSync(datasetJson.name +'.geojson');
									var jsonContent = JSON.parse(contents);
									//precluster
									preCluster(jsonContent, datasetJson.name);
									if(!post){
										io.sockets.emit("success", "Traitement terminé avec succès !");
									} else {
										response.writeHead(200, {'Content-Type': 'application/json'});
										response.end("ok");
									}
									
								}
								console.log(stdout)
							});
							
						});
						 
					}).on("error", function(err) {
						console.log("Error: " + err.message);
						if(!post){
							io.sockets.emit("error", err.message);
						} else {
							response.writeHead(500, {'Content-Type': 'application/json'});
							response.end(err.message);
						}
						
					});
					
				});
			});

			req.on('error', (error) => {
				console.error(error)
			});

			req.write(data);
			req.end();
			
		} else {
			//work on geojson
			console.log("Aucune ressource geoJSON récente n'a été trouvée.");
			if(!post){
				io.sockets.emit("error", "Aucune ressource geoJSON récente n'a été trouvée.");
			} else {
				response.writeHead(500, {'Content-Type': 'application/json'});
				response.end("Aucune ressource geoJSON récente n'a été trouvée.");
			}
			
			//TODO on recheck ?
		}
	}
}

preCluster = function(jsonContent, dname){
	var fields = Object.keys(jsonContent.features[0].properties);
	var fieldId = "id";
	var myregexp = /id/;
	if(!('id' in jsonContent.features[0].properties)){ 
		for(var i=0;i<fields.length;i++){
			if(myregexp.exec(fields[i]) != null){
				fieldId = fields[i];
				break;
			} 
		}
	}

	console.log(fields);

	var index = supercluster({
		radius: 50,
		maxZoom: 16,
		initial: function() { 
			var tab = new Object();
			tab['ids'] = [];
			return tab;},
		map: function(props) {  
			var tab = new Object();
			tab['ids'] = props[fieldId];
			return tab; },
		reduce: function(accumulated, props) { 
			accumulated['ids'] = accumulated['ids'].concat(props['ids']);
		 }
	}); 


	index.load(jsonContent.features);

	for(var i=0; i<17; i++){
		var obj = {
		   type: "FeatureCollection"
		};
		obj.features = index.getClusters([-180, -85, 180, 85], i);
		console.log("file zoom" + i + " with "+ obj.features.length + " features");
		fs.writeFile( dname+'_z'+i+'.geojson', JSON.stringify(obj), 'utf8', function(err){if(err) throw err;});
		io.sockets.emit("info", "Zoom " + i + " traité...");
	}
	console.log("is finished with success");

	io.sockets.emit("info", "Clusterisation des données terminée...");
}

var clusterDirect = function(zoom, json){
	console.log('getClusterDirect('+zoom+')');
	var data;
    var jsonContent = JSON.parse(json);
	var fieldId = "_id";
	/*var fields = Object.keys(jsonContent.features[0].properties);
	var fieldId = "id";
	var myregexp = /id/;
	if(!('id' in jsonContent.features[0].properties)){ 
		for(var i=0;i<fields.length;i++){
			if(myregexp.exec(fields[i]) != null){
				fieldId = fields[i];
				break;
			} 
		}
	}*/
	var index = supercluster({
		radius: 40,
		maxZoom: 16,
		initial: function() { 
			var tab = new Object();
			tab['ids'] = [];
			return tab;},
		map: function(props) {  
			var tab = new Object();
			tab['ids'] = props[fieldId];
			return tab; },
		reduce: function(accumulated, props) { 
			accumulated['ids'] = accumulated['ids'].concat(props['ids']);
		 }
	});
    
    index.load(jsonContent.features);
    data = index.getClusters([-180, -85, 180, 85], zoom);
    
    
    var obj = {
       type: "FeatureCollection"
    };
    obj.features = data;
    return obj;
}
