<?php
// For SGIP:
// http://djazz.mine.nu/apps/sgip/

header("content-type: text/plain");
header("Access-Control-Allow-Origin: *");
set_time_limit(3);

$ip = $_GET['ip'];
$port = isset($_GET['port'])? intval($_GET['port']) : 10052;
$password = isset($_GET['pswd'])? $_GET['pswd'] : '';

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

$result = array();
$result['error'] = 0;

$tcp = @fsockopen("localhost", 8007, $errno, $errstr, 10);
if(!$tcp) {
	$result['error'] = 5;
	echo json_encode($result);
	exit;
}
fwrite($tcp, json_encode(array("ip" => $ip, "port" => $port, "password" => $password)));
echo fread($tcp, 1024*1000);