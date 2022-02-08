#!/usr/bin/env python3

# Query the Azur Lane Wiki Cargo Query table for a JSON database of ships
# Please only run this when necessary

import json
import os
import sys

import requests

def _eprint(*args, **kwargs):
    kwargs['file'] = sys.stderr
    print(*args, **kwargs)

def prettyprint_json(filename: str):
    jsonfile = open(filename, "r", encoding="UTF-8")
    try:
        jsonlist = json.load(jsonfile)
    except json.JSONDecodeError:
        return
    finally:
        jsonfile.close()
    jsonfile = open(filename, "w", encoding="UTF-8")
    json.dump(jsonlist, jsonfile, sort_keys=True, indent=4, ensure_ascii=False)
    jsonfile.write('\n')
    jsonfile.close()

ship_cargo_fields = [
    'ShipGroup',
    'ShipID',
    'Name',
    'CNName',
    'JPName',
    'Rarity',
    'Nationality',
    'ConstructTime',
    'Type',
    'SubtypeRetro',
    'Class',
    'Artist',
    'ArtistLink',
    'ArtistPixiv',
    'ArtistTwitter',
    'VA',
    'Remodel',
    'RemodelId',
    'HealthInitial',
    'Armor',
    'Ammo',
    'Oxygen',
    'FireInitial',
    'AAInitial',
    'TorpInitial',
    'AirInitial',
    'ReloadInitial',
    'EvadeInitial',
    'ConsumptionInitial',
    'Speed',
    'Luck',
    'AccInitial',
    'ASWInitial',
    'HealthMax',
    'FireMax',
    'AAMax',
    'TorpMax',
    'AirMax',
    'ReloadMax',
    'EvadeMax',
    'ConsumptionMax',
    'AccMax',
    'ASWMax',
    'HealthKai',
    'FireKai',
    'AAKai',
    'TorpKai',
    'AirKai',
    'ReloadKai',
    'EvadeKai',
    'SpeedKai',
    'ASWKai',
    'AccKai',
    'Health120',
    'Fire120',
    'AA120',
    'Torp120',
    'Air120',
    'Reload120',
    'Evade120',
    'Acc120',
    'ASW120',
    'HealthKai120',
    'FireKai120',
    'AAKai120',
    'TorpKai120',
    'AirKai120',
    'ReloadKai120',
    'EvadeKai120',
    'AccKai120',
    'ASWKai120',
    'Health125',
    'Fire125',
    'AA125',
    'Torp125',
    'Air125',
    'Reload125',
    'Evade125',
    'Acc125',
    'ASW125',
    'HealthKai125',
    'FireKai125',
    'AAKai125',
    'TorpKai125',
    'AirKai125',
    'ReloadKai125',
    'EvadeKai125',
    'AccKai125',
    'ASWKai125',
    'Eq1Type',
    'Eq1BaseMax',
    'Eq1BaseKai',
    'Eq1EffInit',
    'Eq1EffInitMax',
    'Eq1EffInitKai',
    'Eq2Type',
    'Eq2BaseMax',
    'Eq2BaseKai',
    'Eq2EffInit',
    'Eq2EffInitMax',
    'Eq2EffInitKai',
    'Eq3Type',
    'Eq3BaseMax',
    'Eq3BaseKai',
    'Eq3EffInit',
    'Eq3EffInitMax',
    'Eq3EffInitKai',
    'StatBonusCollectType',
    'StatBonusCollect',
    'StatBonus120Type',
    'StatBonus120',
    'TechPointCollect',
    'TechPointMLB',
    'TechPoint120',
]

ship_urls = [
    'https://azurlane.koumakan.jp/w/api.php?action=cargoquery&tables=ships&format=json&limit=500&offset=0&fields=' + ','.join(ship_cargo_fields),
    'https://azurlane.koumakan.jp/w/api.php?action=cargoquery&tables=ships&format=json&limit=500&offset=500&fields=' + ','.join(ship_cargo_fields)
]

equip_cargo_fields = [
    'Name',
    'Image',
    'BaseID',
    'Type',
    'Stars',
    'Nationality',
    'Tech',
    'CNName',
    'JPName',
    'ENName',
    'Health',
    'HealthMax',
    'HealthOPS',
    'Torpedo',
    'TorpMax',
    'TorpOPS',
    'Firepower',
    'FPMax',
    'FPOPS',
    'Aviation',
    'AvMax',
    'AvOPS',
    'Evasion',
    'EvasionMax',
    'EvasionOPS',
    'PlaneHP',
    'PlaneHPMax',
    'PlaneHPOPS',
    'Reload',
    'ReloadMax',
    'ReloadOPS',
    'ASW',
    'ASWMax',
    'ASWOPS',
    'Oxygen',
    'OxygenMax',
    'OxygenOPS',
    'AA',
    'AAMax',
    'AAOPS',
    'Luck',
    'LuckMax',
    'LuckOPS',
    'Acc',
    'AccMax',
    'AccOPS',
    'Spd',
    'SpdMax',
    'SpdOPS',
    'Damage',
    'DamageMax',
    'DamageOPS',
    'RoF',
    'RoFMax',
    'RoFOPS',
    'Number',
    'Spread',
    'Angle',
    'WepRange',
    'Shells',
    'Salvoes',
    'Characteristic',
    'PingFreq',
    'VolleyTime',
    'Coef',
    'CoefMax',
    'OpSiren',
    'AoE',
    'PlaneSpeed',
    'CrashDamage',
    'DodgeLimit',
    'Ammo',
    'AAGun1',
    'AAGun2',
    'Bombs1',
    'Bombs2',
    'DD',
    'DDNote',
    'CL',
    'CLNote',
    'CA',
    'CANote',
    'CB',
    'CBNote',
    'BM',
    'BMNote',
    'BB',
    'BBNote',
    'BC',
    'BCNote',
    'BBV',
    'BBVNote',
    'CV',
    'CVNote',
    'CVL',
    'CVLNote',
    'AR',
    'ARNote',
    'AE',
    'AENote',
    'SS',
    'SSNote',
    'SSV',
    'SSVNote',
    'DropLocation',
    'Notes',
]

equip_urls = [
    'https://azurlane.koumakan.jp/w/api.php?action=cargoquery&tables=equipment&format=json&limit=500&offset=0&fields=' + ','.join(equip_cargo_fields),
    'https://azurlane.koumakan.jp/w/api.php?action=cargoquery&tables=equipment&format=json&limit=500&offset=500&fields=' + ','.join(equip_cargo_fields)
]

ship_skill_urls = [
    'https://azurlane.koumakan.jp/w/api.php?action=cargoquery&tables=ship_skills&format=json&limit=500&offset=0&fields=_pageName=Page,Num,Name,Detail,Remodel,Type,Icon',
    'https://azurlane.koumakan.jp/w/api.php?action=cargoquery&tables=ship_skills&format=json&limit=500&offset=500&fields=_pageName=Page,Num,Name,Detail,Remodel,Type,Icon',
    'https://azurlane.koumakan.jp/w/api.php?action=cargoquery&tables=ship_skills&format=json&limit=500&offset=1000&fields=_pageName=Page,Num,Name,Detail,Remodel,Type,Icon'
]

for i, url in enumerate(ship_urls):
    _eprint(f'Getting Ship URL: {i}')
    r = requests.get(url)
    if not r.ok:
        _eprint(f'Error getting {entry["name"]} URL: {url}')
        _eprint(f'Status code: {r.status_code}')
        sys.exit(1)
    save_location = f'shiplist_{i}.json'
    _eprint(f'Saving to: {save_location}')
    with open(save_location, "w", encoding='UTF-8') as file:
        file.write(r.text)
