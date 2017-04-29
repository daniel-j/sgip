<?php
// For SGIP:
// http://djazz.mine.nu/apps/sgip/

header("content-type: text/plain");
header("Access-Control-Allow-Origin: *");
set_time_limit(5);

$list = array();

if(isset($_GET['listserver']) && strlen($_GET['listserver']) > 0) {
	$listserver = $_GET['listserver'];
}
else {
	$listserver = "list2.digiex.net";
}

$f = @fsockopen($listserver, 10057, $errno, $errstr, 5);

if(!$f) {
	echo "$errstr ($errno)\n".json_encode($list);
	exit;
}
stream_set_blocking($f, 0);
$raw = "";
while ($f && !feof($f) && connection_status()===0) {
	$raw .= @fgets($f, 1024);
}
fclose($f);

$raw = explode("\n", $raw);

for($i=0; $i < count($raw)-1; $i++) {
	if (empty(trim($raw[$i]))) continue;
	$parts = array(); // Clean the array
	$parts[0] = explode(" ", $raw[$i], 5); // Split up the first parts
	$parts[1][0] = substr($parts[0][4], 2, 4); // Version
	$parts[2] = explode(" ", substr($parts[0][4], 7), 3); // Split up the last parts
	array_pop($parts[0]); // Remove the extra part from the first parts
	$parts = array_merge($parts[0], $parts[1], $parts[2]); // Merge the arrays
	$parts[0] = explode(":", $parts[0]); // IP:port
	$parts[0][1] = +$parts[0][1]; // Force number
	$parts[5] = +$parts[5]; // ...
	$parts[6] = explode("/", substr($parts[6], 1, -1)); // Capacity
	$parts[6][0] = +$parts[6][0]; // Force number
	$parts[6][1] = +$parts[6][1]; // ...
	$parts[7] = htmlentities(utf8_encode(str_replace("\r", "", $parts[7]))); // Remove "\r" in name if any and replace html
	$list[$i] = $parts; // Store in final array
}

echo "\n".json_encode($list); // Make it JSON encoded
