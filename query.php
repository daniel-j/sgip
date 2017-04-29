<?php
// For SGIP:
// http://djazz.mine.nu/apps/sgip/

header("content-type: text/html");
header("Access-Control-Allow-Origin: *");
set_time_limit(3);

$ip = $_GET['ip'];
$port = isset($_GET['port'])? intval($_GET['port']) : 10052;

$result = array();
$result['error'] = 0;

function echoPacket($title, $pack) {
	$len = strlen($pack);
	echo "<!-- Echo of packet $title - START -->\n<table border=\"1\">\n";
	echo "<tr>\n<td> </td>";		//Offsets
	for ($i = 0; $i < $len; $i++) echo "<td>".$i."</td>"; 
	echo "\n</tr>\n";
	echo "<tr>\n<td>$title (txt):</td>\n";	//echo in text form
	for ($i = 0; $i < $len; $i++) echo "<td>".$pack[$i]."</td>";
	echo "\n</tr>\n";
	echo "<tr>\n<td>$title (hex):</td>\n";	//Echo in hex form
	for ($i = 0; $i < $len; $i++) echo "<td>".strtoupper(str_pad(dechex(ord($pack[$i])), 2, "0", STR_PAD_LEFT))."</td>"; 
	echo "\n</tr>\n";	
	echo "<tr>\n<td>$title (dec):</td>\n";	//Echo in decimal form
	for ($i = 0; $i < $len; $i++) echo "<td>".str_pad(ord($pack[$i]),2,"0",STR_PAD_LEFT)."</td>"; 
	echo "\n</tr>\n";
	echo "</table>\n<!-- Echo of packet $title - END -->\n";
}

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
function sendUDP($s) {
	global $udp;
	$s = udpchecksum($s);
	fwrite($udp, $s);
}

$udp = @fsockopen("udp://".$ip, $port, $errno, $errstr, 5);
stream_set_timeout($udp, 5);
if(!$udp) {
	$result['error'] = 1;
	echo json_encode($result);
	exit;
}
$toSend = "yy\x05"."\x00";
sendUDP($toSend);
$query = @fread($udp, 128);
if(!$query) {
	$result['error'] = 2;
	echo json_encode($result);
	exit;
}
fclose($udp);

//echoPacket('query', $query);

$result['version'] = substr($query, 8, 4);
$result['capacity'] = array(ord($query[12]), ord($query[15]));
$result['isPlus'] = strlen($query) >= 19+ord($query[16]); // An extra byta
$result['gamemode'] = ord($query[14]);
$result['servername'] = htmlentities(utf8_encode(substr($query, 17, ord($query[16]))));

echo json_encode($result);
