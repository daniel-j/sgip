
// http://stackoverflow.com/a/5158301
function getParameterByName (name) {
  var match = RegExp('[?&]' + name + '=([^&]*)').exec(window.location.search)
  return match && decodeURIComponent(match[1].replace(/\+/g, ' '))
}

(function () {
  'use strict'

  var listbody = window.document.getElementById('listbody')
  var reloader = window.document.getElementById('reloader')
  var refetcher = window.document.getElementById('refetcher')
  var lsinput = window.document.getElementById('listserverinput')
  var serverlist = []
  var isReloading = false
  var listserver = getParameterByName('listserver') || 'list.digiex.net'

  lsinput.value = listserver

  var updatePaused = false

  var XHR = function (uri, callback) {
    var X = new window.XMLHttpRequest()
    X.open('GET', uri, true)
    X.onload = function () {
      if (X.status === 200) {
        callback(X.responseText)
      } else {
        // alert("The request\n\r"+uri+"\n\rfailed to load, error code "+X.status);
      }
    }
    X.onerror = function () {
      // console.log("XHR error:", X);
    }
    X.send()
    return X
  }

  function zfs (v) { v = v + ''; if (v.length === 1) return '0' + v; return v };

  var colorize = function (s, skipColor) {
    if (!s) {
      return s
    }
    var colors = ['#fff3d6', '#93df00', '#ff0000', '#39aaff', '#ff9300', '#f76fa3', '#fff3d6', '#abc3db', '#00e3af']
    var color = 0
    var out = ''
    var i
    s = s.replace(/&sect;./g, '')
    s = s.split('|')
    for (i = 0; i < s.length; i += 1) {
      if (s[i] === '') {
        continue
      }
      color = i % 9
      if (i > 8) color += 1

      out += '<span style="color: ' + colors[color] + ';">' + s[i] + '</span>'
    }
    return out
  }

  var skipName = function (playerId, name) {
    return false
    // return playerId === 0 && (name === "Zeal" || name === "Camel" || name === "Server" || name === "The Server" || name === "TM" || name === "[Lv1]TM");
  }

  var gamemodes = {
    0: '<abbr title="Single Player">sp</abbr>',
    1: '<abbr title="Cooperative">coop</abbr>',
    2: 'battle',
    3: 'race',
    4: 'treasure',
    5: '<abbr title="Capture The Flag">ctf</abbr>'
  }
  var customGamemodes = {
    1: 'roast tag',
    2: '<abbr title="Last Rabbit Standing">lrs</abbr>',
    3: '<abbr title="Extended Last Rabbit Standing">xlrs</abbr>',
    4: 'pestilence',
    11: 'teambattle',
    12: 'jailbreak',
    13: '<abbr title="Death Capture The Flag">death ctf</abbr>',
    14: 'flagrun',
    15: '<abbr title="Team Last Rabbit Standing">team lrs</abbr>',
    16: 'domination'
  }
  var disconnectMessages = {
    1: 'Server is full',
    2: 'Version different',
    3: 'Server is full',
    4: 'Error during handshaking',
    5: 'Feature not supported in shareware',
    6: 'Error downloading level',
    7: 'Connection lost',
    8: 'Winsock error',
    9: 'Connection timed out',
    10: 'Server stopped',
    11: 'Kicked off',
    12: 'Banned'
  }

  var writeGamemode = function (gm, cgm) {
    if (cgm > 0) {
      if (customGamemodes.hasOwnProperty(cgm)) { return customGamemodes[cgm] } else { return 'unknown' }
    } else if (gamemodes.hasOwnProperty(gm)) {
      return gamemodes[gm]
    } else {
      return 'unknown'
    }
  }

  var capacityColor = function (ratio) {
    ratio /= 100
    if (ratio < 0.33) {
      return 'rgb(0, 100, 0)'
    } else if (ratio < 0.66) {
      return 'rgb(100, 100, 0)'
    } else {
      return 'rgb(100, 0, 0)'
    }
  }

  var updateTime = function () {
    for (var i = 0; i < serverlist.length; i += 1) {
      serverlist[i][5]++
      serverlist[i].firstRow.childNodes[6].innerHTML = readableuptime(serverlist[i][5])
    }
  }
  setInterval(updateTime, 1000)

  var updateServer = function (i, first, second) {
    return function () {
      if (updatePaused) {
        return
      }
      if (isReloading) {
        // console.log("Can't load serverinfo, list is refreshing");
        // return;
      }
      // second.innerHTML = "<td colspan=10>Loading...</td>";
      first.style.backgroundColor = 'rgba(50, 50, 50, 0.25)'
      second.style.backgroundColor = 'rgba(0, 0, 0, 0.5)'
      for (var j = 0; j < serverlist[i].requests.length; j += 1) {
        if (serverlist[i].requests[j]) {
          serverlist[i].requests[j].abort()
        }
      }

      var storageKey = 'sgip_password_' + serverlist[i][0][0] + ':' + serverlist[i][0][1]
      var pswd = window.localStorage[storageKey] || false

      serverlist[i].requests[0] = XHR('serverinfo.php?ip=' + serverlist[i][0][0] + '&port=' + serverlist[i][0][1] + '&v=' + encodeURIComponent(serverlist[i][4].substring(0, 2)) + (pswd ? '&pswd=' + encodeURIComponent(pswd) : '') + '&timestamp=' + new Date().getTime(), function (response) {
        if (isReloading) {
          // console.log("Can't load serverinfo, list is refreshing");
          return
        }

        first.style.backgroundColor = 'rgba(255, 0, 0, 0.2)'
        second.style.backgroundColor = 'rgba(255, 0, 0, 0.2)'

        if (!response) {
          return
        }
        try {
          var serverinfo = JSON.parse(response)
        } catch (e) {
          console.log('Invalid JSON:', response)
          return
        };

        var html = ''
        var j, name, team
        if (serverinfo.totalplayers) {
          html += '<td colspan=12><div class="listwrapper closed">'
          if (serverinfo.gamemode === 5) {
            // html += "<table cellspacing=0 cellpadding=10 width=100%><tr style='background-color: rgba(0, 0, 0, 0.2);'>";
            html += '<table width=100% cellspacing=0 cellpadding=0 class="playerlist"><tbody>'
            for (team = 0; team < 4; team += 1) {
              for (j in serverinfo.players) {
                if (serverinfo.players.hasOwnProperty(j) && serverinfo.players[j].team === team) {
                  name = serverinfo.players[j].name
                  if (!skipName(+j, name)) {
                    var className = 'normal'
                    if (serverinfo.players[j].team === 0) {
                      name = '|||' + name
                      className = 'team-blue'
                    } else if (serverinfo.players[j].team === 1) {
                      name = '||' + name
                      className = 'team-red'
                    } else if (serverinfo.players[j].team === 2) {
                      name = '|' + name
                      className = 'team-green'
                    } else if (serverinfo.players[j].team === 3) {
                      name = '||||' + name
                      className = 'team-yellow'
                    } else {
                      name = '' + name
                    }

                    html += '<tr class="' + className + ' playerinfo" data-playerid="' + j + '"><td align=right width=20 class="number">' + (+j + 1) + '.</td><td class="playername otherFont">' + colorize(name) + '</td><td class="lrscross"></td><td class="points"></td><td class="deaths"></td><td class="ping"></td></tr>'
                  }
                }
              }
            }
            // html += "</tr></table>";
            html += '</tbody></table>'
          } else {
            html += '<table width=100% cellspacing=0 cellpadding=0 class="playerlist"><tbody>'
            for (j in serverinfo.players) {
              if (serverinfo.players.hasOwnProperty(j)) {
                name = serverinfo.players[j].name
                if (!skipName(+j, name)) {
                  html += '<tr data-playerid="' + j + '" class="normal playerinfo"><td align=right width=20 class="number">' + (+j + 1) + '. </td><td class="playername otherFont">' + colorize(name) + '</td><td class="lrscross"></td><td class="points"></td><td class="deaths"></td><td class="ping"></td></tr>'
                }
              }
            }
            html += '</tbody></table>'
          }
          html += '</div></td>'
        } else if (serverinfo.disconnect && serverinfo.disconnect !== 13) {
          var msg = disconnectMessages[serverinfo.disconnect] || 'Unknown error (' + serverinfo.disconnect + ')'
          html += '<td colspan=12 class="disconnect-error"><div class="listwrapper closed"><strong>' + msg + '</strong></div></td>'
        }

        if (serverinfo.error > 0) {
          return
        } else {
          first.style.backgroundColor = ''
          second.style.backgroundColor = ''
        }

        second.innerHTML = html

        // console.log(serverinfo.gamemode, serverinfo.plus, serverinfo.plus.customMode);
        if (serverinfo.gamemode) { first.childNodes[1].innerHTML = writeGamemode(serverinfo.gamemode, serverinfo.plus ? serverinfo.plus.customMode : 0) }
        first.childNodes[7].firstChild.innerHTML = serverinfo.level ? '<a title="' + serverinfo.level + '" href="http://www.jazz2online.com/downloads/search/' + encodeURIComponent(serverinfo.level) + '/" target="_blank">' + serverinfo.level.substring(0, serverinfo.level.length - 4) + '</a>' : ''

        first.className = 'serverhead'
        if (serverlist[i][4].indexOf('24') === 0) {
          first.className += ' v24'
        } else if (serverlist[i][4].indexOf('21') === 0 || serverlist[i][4].indexOf('23') === 0) {
          first.className += ' v21'
        } else {
          first.className += ' vUnknown'
        }
        if (serverinfo.plus && serverinfo.plus.version) {
          first.childNodes[3].innerHTML = "<span style='color: rgba(255, 255, 255, 0.5);'>" + serverinfo.plus.version + '</span>'
        } else {
          first.childNodes[3].innerHTML = ''
        }

        var hasPassword = true
        if (serverlist[i][2] === 'private') {
          if (serverinfo['pswd_ok'] === 1) {
            // first.className+=' hasPassword';
          } else {
            first.className += ' isPrivate'
            hasPassword = false
            first.childNodes[7].firstChild.innerHTML = ''
          }
        } else {
          first.childNodes[9].firstChild.style.display = 'none'
        }

        if (hasPassword) {
          serverlist[i].requests[3] = XHR('extra.php?ip=' + serverlist[i][0][0] + '&port=' + serverlist[i][0][1] + (pswd ? '&pswd=' + encodeURIComponent(pswd) : '') + '&timestamp=' + new Date().getTime(), function (response) {
            if (isReloading || !response) {
              return
            }

            try {
              var extra = JSON.parse(response)
            } catch (e) {
              console.log('Invalid JSON:', response)
              return
            };
            if (extra.error === 0) {
              // console.log(extra)
              var rows = Array.prototype.slice.apply(second.firstChild.firstChild.firstChild.rows)
              var cells
              for (var r = 0; r < rows.length; r++) {
                var row = rows[r]
                var playerId = +row.getAttribute('data-playerid')
                var player = extra.players[playerId]
                cells = row.cells
                if (player) {
                  if ((playerId === 0 && extra.game.isIdleserver) || ((player.fur[0] === 83 && player.fur[1] === 71 && player.fur[2] === 73 && player.fur[3] === 80) && player.name.indexOf('[sgip]') !== -1)) {
                    row.parentNode.removeChild(row)
                  } else {
                    if (player.spectating) {
                      row.parentNode.appendChild(row)
                      row.className = 'playerinfo spectator'
                      cells[1].textContent = player.name.replace(/&sect;./g, '').replace(/\|/g, '')
                    } else {
                      if (((extra.game.customMode === 2 || extra.game.customMode === 15) && player.points === 0) || (extra.game.customMode === 3 && player.deaths === 0)) {
                        cells[2].innerHTML = colorize('|||||||X')
                      }
                      cells[3].innerHTML = colorize((extra.game.customMode === 2 || extra.game.customMode === 15 ? '||||' : '') + player.points)
                      cells[4].innerHTML = colorize((extra.game.customMode === 3 ? '||||' : '||') + player.deaths)
                    }
                    if (player.ping > -1 && playerId !== 0) {
                      cells[5].innerHTML = colorize('|||||||' + player.ping + ' ms')
                    }
                  }
                } else {
                  // console.log(playerId);
                }
              }
              var extraTable = document.createElement('table')
              extraTable.className = 'extraTable'
              second.firstChild.insertBefore(extraTable, second.firstChild.firstChild)
              var extraRow = extraTable.insertRow(-1)
              extraRow.className = 'extraRow'
              for (var i = 0; i < 5; i++) extraRow.insertCell(-1)
              cells = extraRow.cells
              extra.game.time.time = Math.max(0, Math.ceil(extra.game.time.time))
              var hours = Math.floor(extra.game.time.time / (60 * 60))
              var mins = Math.floor(extra.game.time.time / 60) - hours * 60
              var secs = Math.floor(extra.game.time.time) % 60

              cells[4].innerHTML = '<strong>' + colorize(!extra.game.time.autoCycle && !extra.game.time.inPregame && !extra.game.time.inOvertime ? '|STARTED' : '|' + (extra.game.time.started ? (extra.game.time.inPregame ? '|||' : '') + (extra.game.time.inOvertime ? '||' : '') : '|') + zfs(hours) + ':' + zfs(mins) + ':' + zfs(secs)) + '</strong>'
              cells[4].style.width = '70px'
              cells[4].style.textAlign = 'right'
              if (extra.game.gamemode === 5) { // CTF only
                cells[3].innerHTML = colorize('|||' + extra.game.ctf.teams[0].score + '/' + extra.game.maxscore) + ' ' + colorize('||' + extra.game.ctf.teams[1].score + '/' + extra.game.maxscore)
                cells[3].style.textAlign = 'right'
              }
            }
          })
        }
      })

      serverlist[i].requests[1] = XHR('query.php?ip=' + serverlist[i][0][0] + '&port=' + serverlist[i][0][1] + '&timestamp=' + new Date().getTime(), function (response) {
        if (isReloading) {
          // console.log("Can't load query, list is refreshing");
          return
        }
        if (!response) {
          return
        }

        try {
          var query = JSON.parse(response)
        } catch (e) {
          console.log('Invalid JSON:', response)
          return
        };

        if (query.error > 0) {
          return
        }

        serverlist[i][4] = query.version

        first.childNodes[0].childNodes[0].innerHTML = '&nbsp;' + colorize(query.servername) + '&nbsp;'
        first.childNodes[2].innerHTML = '1.' + query.version.trim() + (query.isPlus ? '+' : '')
        var ratio = Math.min(Math.round((query.capacity[0] / query.capacity[1]) * 100), 100)
        first.childNodes[4].firstChild.firstChild.style.width = ratio + '%'
        first.childNodes[4].firstChild.firstChild.style.backgroundColor = capacityColor(ratio)
        first.childNodes[5].innerHTML = query.capacity[0] + '/' + query.capacity[1]
      })

      serverlist[i].requests[2] = XHR('ping.php?ip=' + serverlist[i][0][0] + '&port=' + serverlist[i][0][1] + '&timestamp=' + new Date().getTime(), function (response) {
        if (isReloading) {
          // console.log("Can't load ping, list is refreshing");
          return
        }
        if (!response) {
          return
        }
        var pingnode = first.childNodes[8].childNodes[1]
        if (response === 'error' || response === 'pinging') {
          pingnode.innerHTML = response
        } else {
          try {
            var pingdata = JSON.parse(response)
          } catch (e) {
            console.log('Invalid JSON:', response)
            return
          };
          pingnode.innerHTML = pingdata[0] + ' ms'
          if (pingdata[1]) { // Server private?
            serverlist[i][2] = 'private'
            first.childNodes[9].firstChild.style.display = ''
          } else {
            serverlist[i][2] = 'public'
            first.childNodes[9].firstChild.style.display = 'none'
          }
        }
      })
    }
  }

  var refetchAll = function () {
    var i, j
    for (i = 0; i < serverlist.length; i += 1) {
      for (j = 0; j < serverlist[i].requests.length; j += 1) {
        if (serverlist[i].requests[j]) { serverlist[i].requests[j].abort() }
      }
    }

    for (i = 0; i < serverlist.length; i += 1) {
      setTimeout(serverlist[i].updater, (serverlist.length - i) * 150)
    }
  }

  var readableuptime = function (time) {
    if (time < 60) return time + 's'
    else if (time < 3600) return Math.floor(time / 60) + 'm ' + (time % 60) + 's'
    else if (time < 86400) return Math.floor(time / 3600) + 'h ' + Math.floor((time % 3600) / 60) + 'm ' + ((time % 3600) % 60) + 's'
    else return Math.floor(time / 86400) + 'd ' + Math.floor((time % 86400) / 3600) + 'h ' + Math.floor((time % 3600) / 60) + 'm ' + ((time % 3600) % 60) + 's'
  }

  var listRequest

  var reloadList = function () {
    // listbody.innerHTML = "";
    if (updatePaused) {
      return
    }
    if (isReloading) {
      // console.log("List is already reloading");
      // return;
    }
    isReloading = true
    listbody.style.backgroundColor = 'rgba(0, 0, 0, 0.25)'

    if (listRequest) {
      listRequest.abort()
    }

    for (var i = 0; i < serverlist.length; i += 1) {
      for (var j = 0; j < serverlist[i].requests.length; j += 1) {
        if (serverlist[i].requests[j]) { serverlist[i].requests[j].abort() }
      }
    }

    listRequest = XHR('list.php?listserver=' + encodeURIComponent(listserver) + '&timestamp=' + new Date().getTime(), function (response) {
      /* if(!isReloading) {
        console.log("If not reloading list, return??");
        return;
      } */
      listbody.style.backgroundColor = ''
      isReloading = false

      response = response.split('\n')
      var errorcode = +response[0]
      if (errorcode.length > 0) {
        console.log('Unable to get serverlist: ' + errorcode)
        return
      }
      try {
        var list = JSON.parse(response[1])
      } catch (e) {
        console.log('Unable to parse list.php response:', response)
        return
      }
      listbody.innerHTML = ''
      var i, first, second, spacer
      list = list.sort(function (list1, list2) {
        // Put Zeal servers at bottom \o/
        /* var a = list1[7].indexOf("Zeal ") !== -1 || list1[7].indexOf("Camel Duels") !== -1 ? 0 : 1;
        var b = list2[7].indexOf("Zeal ") !== -1 || list2[7].indexOf("Camel Duels") !== -1 ? 0 : 1;
        var c = a - b;
        if (c === 0) { */
        var a = list1[6][0]
        var b = list2[6][0]
        var c = a - b
        if (c === 0) { // Same player amount, sort by capacity
          a = list1[6][1]
          b = list2[6][1]
          c = a - b
          if (c === 0) { // Same capacity, sort alphabetically
            a = list1[7].toLowerCase().replace(/\|/g, '')
            b = list2[7].toLowerCase().replace(/\|/g, '')
            if (a > b) return -1
            if (a < b) return 1
            return 0
          }
        }
        // }
        return c
      })
      serverlist = list
      var ratio = 0
      for (i = 0; i < list.length; i += 1) {
        first = listbody.insertRow(0)
        second = listbody.insertRow(1)
        spacer = listbody.insertRow(2)
        serverlist[i].firstRow = first
        serverlist[i].secondRow = second
        serverlist[i].spaceRow = spacer
        serverlist[i].requests = []
        ratio = Math.round((list[i][6][0] / list[i][6][1]) * 100)
        if (ratio > 100) ratio = 100

        var storageKey = 'sgip_password_' + list[i][0][0] + ':' + list[i][0][1]
        var passwordOnJoin = window.localStorage[storageKey] ? encodeURIComponent(window.localStorage[storageKey]).replace(/%3A/i, ':') + '@' : ''

        first.innerHTML =
          '<td><strong class="clickable otherFont" style="font-size: 20px">&nbsp;' + colorize(list[i][7]) + '&nbsp;</strong></td>' +
          '<td align=left>' + list[i][3] + '</td>' +
          '<td align=left>1.' + list[i][4] + '</td>' +
          '<td align=left class=smallfont></td>' +
          "<td align=center><div class='playersbar'><div style='width: " + ratio + '%; background-color: ' + capacityColor(ratio) + "'></div></td>" +
          '<td align=center></div> ' + list[i][6][0] + '/' + list[i][6][1] + '</td>' +
          '<td class="uptime" align=right>' + readableuptime(list[i][5]) + '</td>' +
          '<td class="smallfont" align=left><div style="text-overflow: ellipsis; overflow: hidden; display: block; width: 70px;"></div></td>' +
          '<td class="smallfont" align=right>&nbsp;<span style="white-space: nowrap;">pinging</span></td>' +
          '<td align=right><abbr title="Change password"><img src="img/key.gif" class="clickable"></abbr></td>' +
          "<td align=left class=smallfont style='color: rgba(255, 255, 255, 0.5)'>" + list[i][0][0] + ':' + list[i][0][1] + '</td>' +
          "<td><a href='jj2://" + passwordOnJoin + list[i][0][0] + ':' + list[i][0][1] + '/?v=' + encodeURIComponent(list[i][4].trim().substring(0, 2)) + "' title=\"Join server\"><img src=\"img/play.png\"></a></td>"
        list[i].updater = updateServer(i, first, second)

        first.childNodes[0].addEventListener('click', list[i].updater, false)
        first.childNodes[9].firstChild.firstChild.addEventListener('click', (function (row) {
          return function (e) {
            var storageKey = 'sgip_password_' + list[row][0][0] + ':' + list[row][0][1]
            var oldPassword = window.localStorage[storageKey] || ''
            var newPassword = window.prompt('Specify a password for ' + list[row][7] + '\n\rIP:  ' + list[row][0][0] + ' \n\rPort:  ' + list[row][0][1], oldPassword)
            if (newPassword === '') {
              delete window.localStorage[storageKey]
              list[row].updater()
              serverlist[row].firstRow.childNodes[9].childNodes[0].href = 'jj2://' + list[row][0][0] + ':' + list[row][0][1] + '/?v=' + encodeURIComponent(list[row][4].trim())
            } else if (newPassword !== null) {
              window.localStorage[storageKey] = newPassword
              list[row].updater()
              serverlist[row].firstRow.childNodes[9].childNodes[0].href = 'jj2://' + encodeURIComponent(newPassword).replace(/%3A/i, ':') + '@' + list[row][0][0] + ':' + list[row][0][1] + '/?v=' + encodeURIComponent(list[row][4].trim())
            }
          }
        }(i)), false)
        first.childNodes[11].childNodes[0].addEventListener('click', (function (row) {
          return function (e) {
            var storageKey = 'sgip_password_' + list[row][0][0] + ':' + list[row][0][1]
            if (list[row][2] === 'private' && !window.localStorage[storageKey]) {
              e.preventDefault()
              var pswd = window.prompt('Join passworded server\n\r' + list[row][7], '')
              if (pswd.length > 0) {
                pswd = encodeURIComponent(pswd)
                pswd = pswd.replace(/%3A/i, ':')
                window.document.location.href = 'jj2://' + pswd + '@' + list[row][0][0] + ':' + list[row][0][1] + '/?v=' + encodeURIComponent(list[row][4].trim())
              }
            } else {

            }
          }
        }(i)), false)

        second.className = 'serverbody'
        spacer.className = 'spacer'

        first.className = 'serverhead'
        if (list[i][4].indexOf('24') === 0) {
          first.className += ' v24'
        } else if (list[i][4].indexOf('21') === 0 || list[i][4].indexOf('23') === 0) {
          first.className += ' v21'
        } else {
          first.className += ' vUnknown'
        }

        if (list[i][2] === 'private') {
          first.className += ' isPrivate'
        } else {
          first.childNodes[9].firstChild.style.display = 'none'
        }

        spacer.innerHTML = '<td colspan=12></td>'
      }
      refetchAll()
    })
  }

  window.addEventListener('load', function () {
    reloadList()
    setInterval(reloadList, 5 * 60 * 1000)
  }, false)
  reloader.addEventListener('click', function () {
    reloadList()
  }, false)
  refetcher.addEventListener('click', function () {
    refetchAll()
  }, false)
}(window))
