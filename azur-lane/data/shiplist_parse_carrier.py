#!/usr/bin/env python3

import json
import re

re_whitespace = re.compile(r'\s+')
re_condition = re.compile(r'(\w+)(\(((\w+)on)?([a-zA-Z0-9_\.]+)\))?$')
re_f = re.compile(r'(fighter)[^\+]*(\+([0-9]))?$')
re_d = re.compile(r'(divebomber)[^\+]*(\+([0-9]))?$')
re_t = re.compile(r'(torpedobomber)[^\+]*(\+([0-9]))?$')
re_s = re.compile(r'(seaplane)[^\+]*(\+([0-9]))?$')
re_condition_parse = re.compile(r'(m)lb|lb([0-9])|(retrofit)|dev[^0-9]?([0-9]+)')

def parse_conditionless_type(equip_string):
    if equip_string == None:
        return 'N'
    if re_f.search(equip_string):
        return 'F'
    if re_d.search(equip_string):
        return 'D'
    if re_t.search(equip_string):
        return 'T'
    if re_s.search(equip_string):
        return 'S'
    return 'N'

def parse_lb_condition(condition_string):
    lb_num = next(status for status in re_condition_parse.search(condition_string).group(1, 2, 3, 4) if status)
    if lb_num == 'm':
        return 3
    if lb_num == 'retrofit':
        return 4
    lb_num = int(lb_num)
    if lb_num > 4:
        return int(lb_num / 10)
    else:
        return lb_num

def parse_equip_slot(equip_string):
    option_list = re_whitespace.sub('', equip_string.lower()).split('/')
    lb_json = [{}, {}, {}, {}, {}]
    for option in option_list:
        condition = re_condition.search(option)
        if condition:
            condition_group = condition.group(1, 4, 5)
        else:
            raise ValueError(f'invalid condition: {option}')
        base_state = {parse_conditionless_type(condition_group[0]): 1}
        if condition_group[2]:
            lb_num = parse_lb_condition(condition_group[2])
            if condition_group[1]:
                lb_state = {parse_conditionless_type(condition_group[1]): 1}
            else:
                lb_state = base_state
            for i in range(lb_num, 5):
                lb_json[i].update(lb_state)
            if condition_group[1]:
                for i in range(0, lb_num):
                    lb_json[i].update(base_state)
        else:
            for lb_json_entry in lb_json:
                lb_json_entry.update(base_state)
    return lb_json

def strip_null(*args):
    for x in args:
        yield x if x is not None else 0

def parse_carrier_json(ship_json):
    slot_list = [parse_equip_slot(ship_json['Eq1Type']), parse_equip_slot(ship_json['Eq2Type']),  parse_equip_slot(ship_json['Eq3Type'])]
    mlb_count = list(strip_null(ship_json['Eq1BaseMax'], ship_json['Eq2BaseMax'], ship_json['Eq3BaseMax']))
    kai_count = list(strip_null(ship_json['Eq1BaseKai'], ship_json['Eq2BaseKai'], ship_json['Eq3BaseKai']))
    carrier_json = {'Slot1':{}, 'Slot2':{}, 'Slot3':{}}
    carrier_json['Name'] = ship_json['Name']
    reload_pre_kai = int(*strip_null(ship_json['Reload125']))
    reload_kai_125 = int(*strip_null(ship_json['ReloadKai125']))
    reload_stat = reload_kai_125 if reload_kai_125 > 0 else reload_pre_kai
    carrier_json['Reload'] = reload_stat
    carrier_json['ReloadUnkai'] = reload_pre_kai
    for i in range(3):
        slot_key = 'Slot' + str(i + 1)
        lb_json = {'MLB':{}, 'Retrofit':{}}
        carrier_json[slot_key] = lb_json
        carrier_json[slot_key]['MLB'].update(slot_list[i][3])
        for key in carrier_json[slot_key]['MLB'].keys():
            carrier_json[slot_key]['MLB'][key] = int(mlb_count[i])
        carrier_json[slot_key]['Retrofit'].update(slot_list[i][4])
        for key in carrier_json[slot_key]['Retrofit']:
            try:
                count = int(kai_count[i])
            except ValueError:
                count = 0
            if count == 0:
                count = int(mlb_count[i])
            carrier_json[slot_key]['Retrofit'][key] = count
    return carrier_json
