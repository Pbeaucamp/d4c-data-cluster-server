#!/bin/sh

# g = True if we need to get geolocalisation from the API BAN
# n = Node URL
# np = Node path
# d = URL to D4C
# k = D4C API KEY
# pid = Package Name
# rid = Resource ID
# rs = Resource separator (Default is ';')
# re = Resource encoding (Default is 'UTF-8')
# oa = True if the address is only in one column
# a = Address column name
# p = Postal code column name
# s = Minimum score to accept geolocalisation (Between 0 and 100) (Default is '60')
# f = Temp file path

g=$1
n='https://localhost:1337/'
np='/home/user-client/data/clusters'
d=$2
k=$3
pid=$4
rid=$5
rs=$6
re=$7
oa=$8
a=$9
p=$10
s=60
f='/home/user-client/data/temp'
        
#echo "/usr/bin/java -jar /home/user-client/data/bpm.geoloc.creator_1.0.0.jar -g $g -n $n -np $np -d $d -k $k -pid $pid -rid $rid -rs "$rs" -re "$re" -oa $oa -a "$a" -p "$p" -s $s -f $f"
/usr/bin/java -jar /home/user-client/data/bpm.geoloc.creator_1.0.0.jar -g $g -n $n -np $np -d $d -k $k -pid $pid -rid $rid -rs "$rs" -re "$re" -oa $oa -a "$a" -p "$p" -s $s -f $f
#> /home/user-client/data/log.txt
