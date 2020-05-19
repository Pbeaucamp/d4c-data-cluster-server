#!/usr/bin nodejs

var config = require('./config.json');

/* librairie de requete http, depend de si le ckan est ne https ou non*/
var http;var host;var ckan_key = "";
if(config.ckan.url.startsWith('http')){
	if(config.ckan.url.startsWith('https://')){
		http = require('https');
		host = config.ckan.url.replace('https://', '');
	} else {
		http = require('http');
		host = config.ckan.url;
	}
	if(config.ckan.api_key != undefined){
		ckan_key = config.ckan.api_key;
	}
} else {
	console.log("Erreur: l'url du serveur ckan est non valide");
	return;
}

var querystring = require('querystring');
var url = require('url');
var fs = require('fs');
/* chemin vers la lib de cluster */
var supercluster =require(__dirname+"/node_modules/supercluster/dist/supercluster.js");  
//var oboe = require('oboe');
var io = require('socket.io');
var auth = require("basic-auth");
JSONStream = require('JSONStream');

/* options http pour sécuriser le serveur node en https avec les certificats clients */
var options = null;
if(config.server.is_ssl_certified){
	//EX:  key: fs.readFileSync('/etc/nginx/ssl/****.key'),
	//EX:  cert: fs.readFileSync('/etc/nginx/ssl/****.cer')
	options = {
		key: fs.readFileSync(config.server.ssl_key_path),
		cert: fs.readFileSync(config.server.ssl_cert_path)
	};
}

var clustersPath = "clusters/";

/* variable pour sécuriser par login mot de passe certaines routes node */
//EX: const admins = { 'system': { password: 'system' }, };
const admins = {};
admins[config.external_access.login] = { password: config.external_access.password };
//var host = "http://192.168.2.223";  // attention si serveur NOde en https (= options décommenté), host ne doit pas contenir le protocole http:// ou https://

//console.log(host);

/* instanciation du seveur nodeJs */
var process = function (req, res) {
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
  					/*if (!user || !admins[user.name] || admins[user.name].password !== user.pass) {
						console.log('401');
						res.statusCode = 401
						res.setHeader('WWW-Authenticate', 'Basic realm="example"')
						res.end('Access denied')
  					} else {*/
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

							var separator = ("separator" in url_parts.query) ? url_parts.query.separator.toString() : null;
							var encoding = ("encoding" in url_parts.query) != undefined ? url_parts.query.encoding.toString() : null;
							var colCoordinate = ("colCoordinate" in url_parts.query) ? url_parts.query.colCoordinate.toString() : null;
							var coordinateSeparator = ("colCoordinateSeparator" in url_parts.query) != undefined ? url_parts.query.colCoordinateSeparator.toString() : null;
							
							treatDatasets(res, url_parts.query.id.toString(), true, false, separator, encoding, colCoordinate, coordinateSeparator);
							
							
						} catch(e){
							console.log(e);
							setTimeout(function(){io.sockets.emit("error", e);}, 1000);
						}
					//}
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
							//console.log(Object.keys(body));console.log(body);
							body = querystring.parse(body);
							if(body.id == undefined){
								res.writeHead(500, {'Content-Type': 'application/json; charset=utf-8'});
								res.end("La paramètre 'id' du jeu de données est manquant");
								return;
							}

							var separator = body.separator != undefined ? body.separator.toString() : null;
							var encoding = body.encoding != undefined ? body.encoding.toString() : null;
							var colCoordinate = body.colCoordinate != undefined ? body.colCoordinate.toString() : null;
							var coordinateSeparator = body.colCoordinateSeparator != undefined ? body.colCoordinateSeparator.toString() : null;
							
							treatDatasets(res, body.id.toString(), false, true, body, separator, encoding, colCoordinate, coordinateSeparator);	//url_parts.query.createJSON ?
							
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
    
};
var port = 1337;
if(config.server.port != null){
	port = config.server.port;
}

var server;
if(config.server.is_ssl_certified){
	server = http.createServer(options, process).listen(port, '0.0.0.0');
} else {
	server = http.createServer(process).listen(port, '0.0.0.0');
}


io = io.listen(server);

console.log('Server running at http://0.0.0.0:'+port+'/');

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
	
    var path = clustersPath + idRes + "_z" + zoom + ".geojson";
    var data;
    if (fs.existsSync(__dirname + "/" + path)) {
        var contents = fs.readFileSync(__dirname + "/" + path);console.log(__dirname + "/" + path);
        var jsonContent = JSON.parse(contents);console.log(jsonContent.features.length);
        index2.load(jsonContent.features);console.log("index2.getClusters(["+minLong+", "+minLat+", "+maxLong+", "+maxLat+"], "+zoom+")");
        data = index2.getClusters([minLong, minLat, maxLong, maxLat], zoom);
	//data = index2.getClusters([minLat, minLong, maxLat, maxLong], zoom);console.log(JSON.stringify(data));
    } else {
        path = clustersPath + idRes;
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

treatDatasets = function(response, idDataset, createJSON, checkCSV, separator, encoding, columnCoordinate, coordinateSeparator){
		var post = checkCSV;
		/* si ckan en https*/
		var opt = {
			hostname: host,
			port: 443,
			path: '/api/action/package_show?id='+idDataset,
			method: 'GET',
			"rejectUnauthorized": false,
			headers: {
				'Authorization': ckan_key
			}
		};
		//console.log(opt);
		var process = function(resp) {
			var data = '';
			if(!post) setTimeout(function(){io.sockets.emit("info", "Récupération des informations du jeu de données...");}, 1000);
			// A chunk of data has been recieved.
			resp.on('data', function(chunk) {
				data += chunk;
				if(!post) setTimeout(function(){io.sockets.emit("waiting", ".");}, 1000);
			});
			
			// The whole response has been received. Print out the result.
			resp.on('end', function() {
				var result = JSON.parse(data);
				if(result.success == false){
					var err = result.error;
					console.log("Error: " + err.message);
					if(!post) {
						setTimeout(function(){io.sockets.emit("error", err.message);}, 1000);response.writeHead(500, {'Content-Type': 'application/json'});
						response.end(err.message);
					} else {
						response.writeHead(500, {'Content-Type': 'application/json'});
						response.end(err.message);
					}
					return;
				}
				result = result.result;
				var dname = result.name;
				console.log(dname);
				var csvfound = false;
				
				var geoFileExists = false; var dateGeoFile = null;
				geoFileExists = fs.existsSync(clustersPath + dname+'_z0.geojson') || fs.existsSync(clustersPath + dname+'.geojson');
				console.log(geoFileExists);
				if(geoFileExists){
					try{
						var stats = fs.statSync(clustersPath + dname+'_z0.geojson');
						dateGeoFile = new Date(stats.mtime);
					} catch(e){
						var stats = fs.statSync(clustersPath + dname+'.geojson');
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
								workOnGeoJson(response, result, res, dateGeoFile, createJSON, post, separator, encoding, columnCoordinate, coordinateSeparator);
							} else {
								//TODO on recheck ?
								
							}
							
							break;
						} else {
							//work on geojson
							workOnGeoJson(response, result, res, dateGeoFile, createJSON, post, separator, encoding, columnCoordinate, coordinateSeparator);
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
		 
		};
		
		var call;
		if(config.server.is_ssl_certified){
			call = http.get(opt, process);
			//console.log(call);
		} else {
			call = http.get(host+'/api/action/package_show?id='+idDataset, process);
			//console.log(call);
		}
		
		call.on("error", function(err) {
			console.log("Error: " + err.message);
			if(!post) {
				setTimeout(function(){io.sockets.emit("error", err.message);}, 1000);
			} else {
				response.writeHead(500, {'Content-Type': 'application/json'});
				response.end(err.message);
			}
			
		});
}

workOnGeoJson = function(response, datasetJson, csvResourceJson, dateGeoFile, createJSON, post, separator, encoding, columnCoordinate, coordinateSeparator){
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
								
		var opt2 = {
			hostname: host,
			port: 443,
			path: recentGeo.url, //res.url.replace('https://data-backoffice.anfr.fr', ''),///dataset/dd11fac6-4531-4a27-9c8c-a3a9e4ec2107/resource/de93c1ff-55a4-48f3-adc5-a1887a86d77c/download/observatoire_2g_3g_4g-1.geojson',
			method: 'GET',
			"rejectUnauthorized": false
		};
		console.log(recentGeo.url);
		var process = function(resp) {
			var data = '';
			 
			resp.on('data', function(chunk) {
				data += chunk;
				if(!post) io.sockets.emit("waiting", ".");
			});
			 
			resp.on('end', function() {
				if(!post) io.sockets.emit("info", "Le fichier a été récupéré...");
				var name = datasetJson.name+'.geojson';
				fs.writeFile(clustersPath + name, data, 'utf8', function(err){if(err) throw err;});
				
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
			 
		};
		var call;
		if(config.server.is_ssl_certified){
			call = http.get(opt2, process);
		} else {
			console.log(recentGeo.url);
			call = http.get(recentGeo.url, process);
		}
		
		call.on("error", function(err) {
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
			var port;var host2;
			if(config.ckan.url.startsWith('https://')){
				port = 443;
				host2 = host;
			} else {
				port = 80;
				host2 = host.replace("http://", "");
			}
			var opt = {
				hostname: host2,
				path: '/api/action/datastore_info',
				method: 'POST',
				port: port, //443 si https
				headers: {
					'Content-Type': 'application/json',
					'Content-Length': data.length,
					'Authorization': ckan_key
				}
			};
			var req = http.request(opt, function(res) {
				console.log(`statusCode: ${res.statusCode}`);

				res.on('data', (d) => {
					//process.stdout.write(d);
					var fields = Object.keys(JSON.parse(d).result.schema);
					var fieldId = "id";
					var fieldCoord = "coordonnees";
					// var idRegex = /id|num|code|siren|bureau|nofiness|depcom/;
					var coordRegex = /geo_point|coordin|coordon|geopoint|geoPoint|pav_positiont2d|geoloc|wgs84|equgpsy_x|geoban|codegeo/;
					console.log(fields);
					/*if(fields.indexOf('id') == -1){ 
						for(var i=0;i<fields.length;i++){
							if(idRegex.exec(fields[i]) != null){
								fieldId = fields[i];
								break;
							} 
						}
					}*/
					fieldId = '_id';
					console.log(fieldId);

					// We check if the coordinate column is defined as a parameters.
					// If not we check if the column coordonnees exist
					// If not we apply a pattern to search for a suitable collumn
					console.log("Coordinate column " + columnCoordinate);
					if (fields.indexOf(columnCoordinate) == -1) {
						if(fields.indexOf('coordonnees') == -1){ 
							for(var i=0;i<fields.length;i++){
								if(coordRegex.exec(fields[i]) != null){
									fieldCoord = fields[i];
									break;
								} 
							}
						}
						else {
							fieldCoord = fields[fields.indexOf('coordonnees')];
						}
					}
					else {
						fieldCoord = fields[fields.indexOf(columnCoordinate)];
					}
					console.log(fieldCoord);

					//create file
					if(!post) setTimeout(function(){io.sockets.emit("info", "Récupération de la ressource csv pour création geojson...");}, 1000);
										
					var opt2 = {
						hostname: host,
						port: 443,
						path: csvResourceJson.url, //res.url.replace('https://data-backoffice.anfr.fr', ''),///dataset/dd11fac6-4531-4a27-9c8c-a3a9e4ec2107/resource/de93c1ff-55a4-48f3-adc5-a1887a86d77c/download/observatoire_2g_3g_4g-1.geojson',
						method: 'GET',
						"rejectUnauthorized": false
					};

					var process = function(resp) {
						var data = '';
						 
						resp.on('data', function(chunk) {
							data += chunk;
							if(!post) setTimeout(function(){io.sockets.emit("waiting", ".");}, 1000);
						});
						 
						resp.on('end', function() {
							if(!post) setTimeout(function(){io.sockets.emit("info", "Le fichier a été récupéré...");}, 1000);
							var name = datasetJson.name+'.'+csvResourceJson.format;
							fs.writeFile(clustersPath + name, data, 'utf8', function(err){if(err) throw err;});
							//console.log(data);
							console.log("file downloaded");
							const exec = require('child_process').exec;

							var separatorParam = "";
							if (separator != undefined) {
								separatorParam = '-s "' + separator + '"';
							}

							var encodingParam = "";
							if (encoding != undefined) {
								encodingParam = '-e "' + encoding + '"';
							}

							//We remove this because the separator must be , in coordinate or there is error in datastore database
							// var coordinateSeparatorParam = "";
							// if (coordinateSeparator != undefined) {
							// 	coordinateSeparatorParam = '-cs "' + coordinateSeparator + '"';
							// }

							var command = 'java -jar bpm.geojson.creator_0.0.2.jar -i "' + clustersPath + name + '" -o "'+ clustersPath + datasetJson.name + '.geojson" -id "' + fieldId + '" ' + separatorParam + ' ' + encodingParam + ' -coor "' + fieldCoord + '" ';
							console.log(command.split(" "));
							
							setTimeout(function(){
								const childPorcess = exec(command, function(err, stdout, stderr) {
									if (err) {
										console.log(err)
										if(!post){
											setTimeout(function(){io.sockets.emit("error", err.message);}, 1000);
										} else {
											response.writeHead(500, {'Content-Type': 'application/json'});
											response.end(err.message);
										}
									}
									else {
										console.log("Json created " + datasetJson.name);
										/*var contents = fs.readFileSync(datasetJson.name +'.geojson');
										console.log("Json red " + contents.length);
										try{
										var jsonContent = JSON.parse(contents);
										console.log("Json parsed " + jsonContent.type);
										} catch(e){
												console.log(e);
										}
										//precluster
										preCluster(jsonContent, datasetJson.name);
										if(!post){
											io.sockets.emit("success", "Traitement terminé avec succès !");
										} else {
											response.writeHead(200, {'Content-Type': 'application/json'});
											response.end("ok");
										}
										*/
										
										var transformStream = JSONStream.parse( "*" );
										var inputStream = fs.createReadStream(clustersPath + datasetJson.name +'.geojson');
										var jsonContent;
										inputStream.pipe( transformStream )
											// Each "data" event will emit one item in our record-set.
											.on("data", function handleRecord( data ) {
												jsonContent = data;
											})
											// Once the JSONStream has parsed all the input, let's indicate done.
											.on("end", function handleEnd() {
												console.log("Json parsed");
												//precluster
												jsonContent.features = jsonContent;
												//console.log(jsonContent.slice(0, 10));
												preCluster(jsonContent, datasetJson.name);
												if(!post){
													io.sockets.emit("success", "Traitement terminé avec succès !");
												} else {
													response.writeHead(200, {'Content-Type': 'application/json'});
													response.end("ok");
												}
											});
									}
									console.log(stdout)
								});
							}, 2000);
						});
						 
					};
					
					var call;
					if(config.server.is_ssl_certified){
						call = http.get(opt2, process);
					} else {
						call = http.get(csvResourceJson.url, process);
					}
					
					call.on("error", function(err) {
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

preCluster = function(jsonContent, dname){console.log("preclustering");
	var fields = Object.keys(jsonContent.features[0].properties);
	var fieldId = "id";
	var myregexp = /id|num|code|siren|bureau|nofiness|depcom/;
	/*if(!('id' in jsonContent.features[0].properties)){ 
		for(var i=0;i<fields.length;i++){
			if(myregexp.exec(fields[i]) != null){
				fieldId = fields[i];
				break;
			} 
		}
	}*/
	fieldId = '_id';

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

	jsonContent.features = jsonContent.features.filter(function(f){ return f.geometry != null && f.geometry.coordinates.length>1;});
	//jsonContent.features = jsonContent.features.map(function(f){ var val = f.properties[fieldId]; f.properties = {}; f.properties[fieldId] = val; return f;});
	//console.log(jsonContent.features[0].geometry);
	index.load(jsonContent.features);

	for(var i=1; i<17; i++){
		var obj = {
		   type: "FeatureCollection"
		};
		obj.features = index.getClusters([-180, -85, 180, 85], i);
		console.log("file zoom" + i + " with "+ obj.features.length + " features");
		fs.writeFile(clustersPath + dname+'_z'+i+'.geojson', JSON.stringify(obj), 'utf8', function(err){if(err) throw err;});
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
			/*var tab = new Object();
			tab['ids'] = props[fieldId];
			return tab;*/ },
		reduce: function(accumulated, props) { 
			//accumulated['ids'] = accumulated['ids'].concat(props['ids']);
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