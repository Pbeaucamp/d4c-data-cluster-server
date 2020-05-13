#!/bin/sh

# g = 0 if we don't need it, 1 if we need to get geolocalisation from the API BAN, 2 if we need to merge two coordinate column
# n = Node URL
# np = Node path
# d = URL to D4C
# k = D4C API KEY
# pid = Package Name
# rid = Resource ID
# rs = Resource separator (Default is ';')
# re = Resource encoding (Default is 'UTF-8')
# oa = True if the address is only in one column
# coor = Coordinate column name
# cs = Coordinate column separator (Default is '" + DEFAULT_COORDINATE_SEPARATOR + "')");	
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
cs=','
s=60
f='/home/user-client/data/temp'
        
echo "/usr/bin/java -jar /home/user-client/data/bpm.geoloc.creator_1.0.0.jar -g $g -n $n -np $np -d $d -k $k -pid $pid -rid $rid -rs \"$rs\" -re \"$re\" -oa $oa -a \"$a\" -p \"$p\" -s $s -f $f"
/usr/bin/java -jar /home/user-client/data/bpm.geoloc.creator_1.0.0.jar -g $g -n $n -np $np -d $d -k $k -pid $pid -rid $rid -rs "$rs" -re "$re" -oa $oa -a "$a" -p "$p" -cs "$cs" -s $s -f $f
> /home/user-client/data/log.txt
