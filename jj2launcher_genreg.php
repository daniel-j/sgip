<?php

header('Content-Type: application/x-regedit');
header('Content-disposition: attachment; filename="jj2launcher_install.reg";');

$path = $_GET['path'];

$path = rtrim(dirname($path."/x"), "\\");

?>REGEDIT4

[HKEY_CLASSES_ROOT\jj2]
"URL Protocol"=""
@="URL:Jazz Jackrabbit 2 Launcher"

[HKEY_CLASSES_ROOT\jj2\DefaultIcon]
@="\"<?php echo addslashes($path."\\icon.ico"); ?>\",0"

[HKEY_CLASSES_ROOT\jj2\shell]

[HKEY_CLASSES_ROOT\jj2\shell\open]

[HKEY_CLASSES_ROOT\jj2\shell\open\command]
@="\"<?php echo addslashes($path."\\node"); ?>\" \"<?php echo addslashes($path."\\jj2launcher.js"); ?>\" \"%1\""