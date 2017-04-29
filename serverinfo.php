<?php
// For SGIP:
// http://djazz.mine.nu/apps/sgip/

header("content-type: text/html");
header("Access-Control-Allow-Origin: *");
set_time_limit(3);

$ip = $_GET['ip'];
$port = isset($_GET['port'])? intval($_GET['port']) : 10052;
$password = isset($_GET['pswd'])? $_GET['pswd'] : '';
$serverVersion = isset($_GET['v']) ? str_pad(substr($_GET['v'], 0, 4), 4, " ") : "24  ";

$result = array();
$result['error'] = 0;
$result['disconnect'] = 0;
$result['pswd_ok'] = 0;

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
function sendTCP($s) {
	global $tcp;
	$s[0] = chr(strlen($s));
	fwrite($tcp, $s, strlen($s));
}
function sendUDP($s) {
	global $udp;
	$s = udpchecksum($s);
	fwrite($udp, $s);
}
$debug_start = microtime(true);

if($password) {
	$fp = fsockopen("udp://".$ip, $port, $errno, $errstr);
	socket_set_timeout ($fp, 3);
	if (!$fp) {
		$result['pswd_ok'] = 0;
	}
	else {
		
		$pass = "yy"."\x0A".chr(strlen($password)).$password; // Password packet
		
		$pass = udpchecksum($pass);
		
		if (fwrite($fp, $pass)) {
			
			$reply = fread($fp, 26);
			if (!$reply) {
				$result['pswd_ok'] = 0;
			}
			else {
				if (ord($reply[2]) === 11) {	// Check if it's the right packet
					if(ord($reply[3])) {
						$result['pswd_ok'] = 1;
					}
				}
			}
		}
		else {
			$result['pswd_ok'] = 0;
		}
		fclose($fp);
	}
}


$tcp = @fsockopen($ip, $port, $errno, $errstr, 10);
if(!$tcp) {
	$result['error'] = 5;
	echo json_encode($result);
	exit;
}

$toSend = "y\x0F\x00\x00".$serverVersion."\x01";
sendTCP($toSend);

$socknum = -1;
$closed=false;
$totalplayers=0;
$isPlus = false;
$player = array();
while (!$closed && $res = @fread($tcp, 8192)) {
	$p = 0; $j = strlen($res);
	$special = false;
	while ($p < $j) {											//Puts all the packets in an array.
		
		$l = ord(substr($res,$p,1));
		
		if ($l === 0) $l++;										//Safety measure
		if ($isPlus && $special) {
			$res_a[$p] = chr($l).substr($res,$p+2,$l);
			$p+=2;

		} else {
			$res_a[$p] = substr($res,$p,$l);
		}
		$p += $l;
		if ($isPlus && $p < $j && ord($res[$p]) === 0) {
			$p++;
			$special = true;
		}
	}
	
	foreach ($res_a as $key => $res1) { 					//Loops through packet array
		
		if($closed) break;
		$packetID = ord(substr($res1,1,1));
		//echo "tcp packet $packetID: ".(microtime(true) - $debug_start)."\n";
		//echo dechex($packetID)." ";
		switch($packetID) {

			case 0x0D:
				if(ord($res1[3]) === $socknum || $socknum === -1) {
					$result['disconnect'] = ord($res1[2]);

					$closed = true;
				}
				break;
			
			case 0x10: //0x10 Server details
				//We're jj2+
				//$toSend = "y\x3F\x20\x01\x00\x00\x03\x00";
				//$toSend = "y\x3F\x20\x00\x02\x00\x00\x00";
				$toSend = "y\x3F\x20\x01\x00\x00\x03\x00";
				sendTCP($toSend);
				$i = 2;
				$socknum = ord($res1[$i++]);
				$playernum = ord($res1[$i++]);
				
				$lvlFLen = ord($res1[$i++]);
				$result['level'] = substr($res1, 5, $lvlFLen);
				$i += $lvlFLen;
				$i += 8; // Skips CRC lvl + tileset
				$result['gamemode'] = ord($res1[$i++]);
				$result['maxscore'] = ord($res1[$i++]);

			
				$n = chr(167).chr(124).chr(167)."1"."SGIP"; // Will look like "SGIP joined the game" on nonplus JJ2 servers
				$toSend = "y\x0E\x01".chr($playernum)."\x00"."SGIP".$n."\x00";
				
				sendTCP($toSend);
				break;
			
			case 0x12:
				$packetLength = strlen($res1);
				$i = 3;
				
				while ($packetLength > $i) {
					//echo decbin(ord($res1[$i-2]))." ".$res1[$i-2]."<br>";
					$psock = ord(substr($res1,$i,1)); $i++;
					$pplayer = ord(substr($res1,$i,1)); $i++;
					$player[$pplayer]['sock'] = $psock;
					
					if($isPlus) {
						$player[$pplayer]['char'] = ord($res1[$i++]);
						$player[$pplayer]['team'] = ord($res1[$i++]);
					}
					else {					
						$pcharTeam = ord(substr($res1,$i,1)); $i++;
						$player[$pplayer]['char'] = $pcharTeam & 3;
						$player[$pplayer]['team'] = ($pcharTeam & 16)/16;
					}
					
					$player[$pplayer]['fur'][0] = ord(substr($res1,$i,1)); $i++;
					$player[$pplayer]['fur'][1] = ord(substr($res1,$i,1)); $i++;
					$player[$pplayer]['fur'][2] = ord(substr($res1,$i,1)); $i++;
					$player[$pplayer]['fur'][3] = ord(substr($res1,$i,1)); $i++;
					
					$pname = "";
					while (ord(substr($res1,$i,1)) !== 0) { $pname .= substr($res1,$i,1); $i++; } // Append character to $pname until null
					$i++;
					$player[$pplayer]['name'] = htmlentities(utf8_encode($pname));
					
					if($psock === $socknum) {
						unset($player[$pplayer]);
						
					}
					else {
						$totalplayers++;
					}
					
				}
				break;
			
			case 0x13: // Game initiation
				//sendTCP("y\x1A");
				
				$closed = true;
				fclose($tcp);
				
				break;
			
			case 0x3F:
				$isPlus = true;
				$i = 2;
				list(,$minor,$major) = unpack("v2", substr($res1,$i,4));
				$result['plus']['version'] = $major.".".$minor;
				$i+=4;
				
				$result['plus']['customMode'] = ord(substr($res1,$i,1)); $i++;
				$result['plus']['startHealth'] = ord(substr($res1,$i,1)); $i++;
				$result['plus']['maxHealth'] = ord(substr($res1,$i,1)); $i++;
				$plusByte = ord(substr($res1,$i,1)); $i++;
				
				$result['plus']['plusOnly'] = $plusByte&1;
				$result['plus']['friendlyFire'] = ($plusByte>>1)&1;
				$result['plus']['noMovement'] = ($plusByte>>2)&1;
				$result['plus']['noBlink'] = ($plusByte>>3)&1;
				
				break;

			default:
				
				break;
			
		}
	}
}

$result['players'] = $player;
$result['totalplayers'] = $totalplayers;

//echo "all done: ".(microtime(true) - $debug_start)."\n";

echo json_encode($result);
