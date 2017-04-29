<?php
// For SGIP:
// http://djazz.mine.nu/apps/sgip/

header("content-type: text/plain");
header("Access-Control-Allow-Origin: *");
set_time_limit(3);

$ip = $_GET['ip'];
$port = isset($_GET['port'])? intval($_GET['port']) : 10052;

function udpchecksum ($buf) {
	$x = 1;
	$y = 1;
	$size = strlen($buf);
	for($i = 2; $i < $size; $i++) {
		$x += ord($buf[$i]);
		$y += $x;
	}
	$buf[0] = chr($x % 251);
	$buf[1] = chr($y % 251);
	return $buf;
}

$udp = @fsockopen("udp://".$ip, $port, $errno, $errstr, 3);
stream_set_timeout($udp, 3);
if(!$udp) {
	die('pinging');
}
$toSend = "yy\x03"."SGIP2"."\0x00\x00\x00\x00"; //Ping packet;
$toSend = udpchecksum($toSend);
fwrite($udp, $toSend);
$time_start = microtime(true);
$res = @fread($udp, 32);
$time_end = microtime(true);
if(!$res) {
	die("pinging");
}
fclose($udp);

$private = (ord($res[8])>>5) & 1;

if(ord($res[2]) === 4 && substr($res, 3, 5) === "SGIP2") {
	echo json_encode(array(round(($time_end - $time_start)*1000), $private));
}
else {
	echo 'error';
}
