!macro AddProtocolHandler fileshare "Fileshare Protocol"
  DeleteRegKey SHELL_CONTEXT "Software\Classes\${Protocol}"
  WriteRegStr SHELL_CONTEXT "Software\Classes\${Protocol}" "" "${Description}"
  WriteRegStr SHELL_CONTEXT "Software\Classes\${Protocol}" "URL Protocol" ""
  WriteRegStr SHELL_CONTEXT "Software\Classes\${Protocol}\DefaultIcon" "" "$appExe,0"
  WriteRegStr SHELL_CONTEXT "Software\Classes\${Protocol}\shell" "" ""
  WriteRegStr SHELL_CONTEXT "Software\Classes\${Protocol}\shell\open" "" ""
  WriteRegStr SHELL_CONTEXT "Software\Classes\${Protocol}\shell\open\command" "" "$appExe %1"
!macroend