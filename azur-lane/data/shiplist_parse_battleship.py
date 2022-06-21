#!/usr/bin/env python3

def parse_battleship_json(ship_json):
    battleship_json = {}
    battleship_json['Name'] = ship_json['Name']
    reload_pre_kai = int(ship_json['Reload125'])
    reload_kai_125 = ship_json['ReloadKai125']
    reload_kai_125 = int(reload_kai_125) if reload_kai_125 is not None else 0
    reload_stat = reload_kai_125 if reload_kai_125 > 0 else reload_pre_kai
    battleship_json['Reload'] = reload_stat
    battleship_json['ReloadUnkai'] = reload_pre_kai
    return battleship_json
