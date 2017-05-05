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
$toSend = "yy\x05"."\x00\x01";
sendUDP($toSend);
$query = @fread($udp, 1024);
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
$offset = 18 + ord($query[16]);

//extended reply
if(strlen($query) > $offset + 1) {
    $flags = ord($query[$offset]);
    $result['private'] = ($flags & 1) == 1;
    $result['plusOnly'] = ($flags & 2) == 2;
    $result['idleserver'] = ($flags & 4) == 4;
    $result['extended'] = true;
} else {
    $result['extended'] = false;
}

if(strlen($query) > $offset + 2) {
    //these values are present if $result['private'] == false, else they aren't
    $result['maxScore'] = ord($query[$offset + 1]);
    $result['scoreBlue'] = ord($query[$offset + 2]);
    $result['scoreRed'] = ord($query[$offset + 3]);
    $result['scoreGreen'] = ord($query[$offset + 4]);
    $result['scoreYellow'] = ord($query[$offset + 5]);
    
    $players_raw = substr($query, $offset + 6);
    $players = [];
    while(!$result['idleserver']) {
        $player = [];
        $chunks = explode("\0", $players_raw);
        $player['name'] = htmlentities(utf8_encode($chunks[0]));
        $offset = strlen($chunks[0]);
        $player['score'] = ord(substr($players_raw, $offset + 1, 1));
        $player['team'] = (ord(substr($players_raw, $offset + 2, 1)) & 3);
        $player['spectating'] = (ord(substr($players_raw, $offset + 2, 1)) & 4) == 4;
        $players[] = $player;
        $players_raw = substr($players_raw, $offset + 3);
        if(count($players) == $result['capacity'][0]) {
            break;
        }
    }
    $result['players'] = $players;
    $result['levelfile'] = htmlentities(utf8_encode(trim($players_raw)));
}

echo json_encode($result);
