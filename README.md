# Serveur NodeJs de Clusterisation Data4Citizen 

---

Ce serveur est indispensable pour le bon fonctionnement cartographique des jeux de données géographiques sur la plateforme Data4Citizen.

Il offre plusieurs fonctionnalités : 

1. Mise à jour des données géographiques en se basant sur un fichier csv sur la plateforme CKAN
  * génération du fichier GeoJSON
  * lancement de la pré-clusterisation
2. Pré-clusturisation des points géographiques par niveau de zoom, afin d'accelérer l'affichage sur la plateforme
3. Envoi des "bulles" de clusters à la plateforme sur demande

---

## Prérequis

Quelques prérequis sont nécessaire au fonctionnement du serveur de cluster NodeJS.

Il faut que nodeJs soit installé sur le serveur. Il est également possible d'installer NPM si il y a besoin d'importer de nouveaux packages Node.

Par convention tout ce repository doit être copié dans une dossier **/data**, pouvant être adressé comme ceci **/home/bpm/data/**. 

Il est préférable que le serveur choisi soit le même que celui contenant le site Drupal pour des raisons de performance, et si possible le même qui celui contenant le CKAN, pour les mêmes raison. 

---

## Installation NodeJS

https://github.com/nodesource/distributions/blob/master/README.md

`apt-get install nodejs`

### Spécification sous Ubuntu (installation d'une ancienne version sous Ubuntu avec la ccommande ci-dessus) 

`curl -sL https://deb.nodesource.com/setup_7.x | sudo -E bash -`

`sudo apt-get install -y nodejs`

ou version plus récente si besoin (voir **Lancement du serveur**).

---

## Récupération du repository Git

Pour une configuration telle que **/home/bpm/data/** exécuter la commande ci-après:

`git clone http://gitlab.bpm-conseil.com/data4citizen/d4c-data-cluster-server.git data`

---

## Paramétrage

Deux fichiers sont à modifier avant le lancement du serveur.

- config.json
- preCluster.html

Plus besoin de toucher au fichier nodeCluster.js.

Explications de la configuration:

```json
{
	"server":
	{
		"is_ssl_certified":false,  //si le serveur nodejs doit etre accessible https
		"ssl_key_path": /etc/nginx/ssl/***.key,      
		"ssl_cert_path": /etc/nginx/ssl/***.cert,
		"port": 1337
	},
	"ckan":
	{
		"url":"http://192.168.2.223",
		"api_key": "xxxxxxxxxxxxxxxxx"
	},
	"external_access": //authentification pour le préCluster par exemple
	{
		"login": "system",
		"password": "system"
	}
}
```

---

## Lancement du serveur

Le serveur de cluster NodeJS peut être lancé manuellement pour les tests via la commande `nodejs nodeCluster.js` en étant placé dans le dossier **/data** ou en tant que service linux.

Un fichier d'exemple est disponible **cluster_node.service**. Ce fichier est préconfiguré et peut être copié directement dans le systemd. Quelques modifications peuvent être nécessaires pour s'adapter au serveur Linux.

Après modifications si nécéssaires :

`cp cluster_node.service /etc/systemd/system/cluster_node.service`

`systemctl enable cluster_node.service`

`systemctl start cluster_node.service`

`systemctl status cluster_node.service`

Il permet de démarrer le serveur NodeJs automatiquement.

Si le lancement du serveur provoque une erreur de compilation, c'est que la version de NodeJs installée par defaut n'est pas assez récente. Se référer alors à cette page pour installer une version plus récente (v8.x par exemple) : https://github.com/nodesource/distributions/blob/master/README.md

---

## Quelques explications

Le dossier **node_modules** contient tous les packages/modules NodeJs nécessaires au bon fonctionnement de notre serveur.

Le principal module se nomme **supercluster**. IL est possible, que lors de l'installation d'un nouveau module, ce module soit réinitialisé de façon incorrecte. Il suffit alors de copier dans le dossier **dist** du module, les fichiers **supercluter.js** et **supercluster.min.js** présents à la racine du repository.

Le fichier **nodeCluster.js** est le serveur de Cluster et de Pré-Cluster. Il contient toute l'implémentation.

Le fichier **preCluster.html** est une page html appelé lors d'une pré-clusterisation via interface navigateur (http://<serveur>:1337/preCluster?). Cette page dialogue avec le serveur Node via sockets.

Le fichier **bpm.geojson.creator_0.0.1.jar** est un executable qui est appelé pour la génération des fichiers GeoJSON à partir de CSV.

Le fichier **cluster_node.service** est un exemple de configuration du service linux permettant de gérer le serveur NodeJS.