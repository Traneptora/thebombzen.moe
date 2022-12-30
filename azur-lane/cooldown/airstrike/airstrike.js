// planecounts and times must already be numbers
function get_airstrike_cooldown(plane1time, plane1count, plane2time, plane2count, plane3time, plane3count, reloadstat, reloadbonus, reloadbuff, beacon, cooldown_reduction, init_cooldown_reduction){
    let plane_count = plane1count + plane2count + plane3count;
    if (plane_count <= 0){
        return [-1.0];
    }
    plane1time = plane1count != 0 ? +plane1time : 0.0;
    plane2time = plane2count != 0 ? +plane2time : 0.0;
    plane3time = plane3count != 0 ? +plane3time : 0.0;
    let weighted_cooldown_average = (plane1time * plane1count + plane2time * plane2count + plane3time * plane3count ) / plane_count;
    let adjusted_reload = (1 + (reloadstat + reloadbonus) / 100.0 * (1 + reloadbuff / 100.0));
    let cooldown = Math.pow(adjusted_reload, -0.5) * 3.111269837 * weighted_cooldown_average;
    let init_cooldown = cooldown;
    let cd_reduction = +cooldown_reduction;
    let init_cd_reduction = +init_cooldown_reduction;
    if (beacon){
        cd_reduction = +cd_reduction + 4.00;
    }
    init_cd_reduction += cd_reduction;
    init_cooldown = init_cooldown * (1.0 - init_cd_reduction / 100.0);
    cooldown = cooldown * (1.0 - cd_reduction / 100.0);
    init_cooldown += 1.6;
    cooldown += 0.1;
    if (cooldown > 0.0 && cooldown < 300.0 && init_cooldown > 0.0 && init_cooldown < 300.00){
        let timer = init_cooldown;
        let ret = [roundBase10(cooldown, 2)];
        while (timer < 300.00){
            ret.push(roundBase10(timer, 2));
            timer += cooldown;
        }
        return ret;
    } else {
        return [-1.0];
    }
}

function calculate_reload(){
    let reloadstat = document.getElementById("txt-rld-stat-base").value;
    let reloadbonus = document.getElementById("txt-rld-stat-bonus").value;
    let reloadbuff = document.getElementById("reloadbufftextfield").value;
    let plane1time = document.getElementById("plane1cdtextfield").value;
    let plane1count = document.getElementById("plane1counttextfield").value;
    let plane2time = document.getElementById("plane2cdtextfield").value;
    let plane2count = document.getElementById("plane2counttextfield").value;
    let plane3time = document.getElementById("plane3cdtextfield").value;
    let plane3count = document.getElementById("plane3counttextfield").value;
    let cooldown_reduction = document.getElementById("cdreduction1textfield").value;
    let initial_cooldown_reduction = document.getElementById("cdreduction2textfield").value;
    let beacon = document.getElementById("beaconbox").checked;
    let cooldown = get_airstrike_cooldown(+plane1time, +plane1count, +plane2time, +plane2count, +plane3time, +plane3count, +reloadstat, +reloadbonus, +reloadbuff, beacon, +cooldown_reduction, +initial_cooldown_reduction);
    if (cooldown[0] > 0.0){
        document.getElementById("finalcooldown").textContent = cooldown.shift() + "s";
        document.getElementById("initcooldown").textContent = cooldown[0] + "s";
        document.getElementById("finalstriketimers").textContent = cooldown.join(", ") + "";
    } else {
        document.getElementById("finalcooldown").textContent = "Some Error Occurred :(";
        document.getElementById("initcooldown").textContent = "";
        document.getElementById("finalstriketimers").textContent = "";
    }
}

function update_textfields(idnumber){
    let cdtextfield = document.getElementById('plane' + idnumber + 'cdtextfield');
    let cddropdown = document.getElementById('plane' + idnumber + 'cddropdown');
    let dropdownvalue = cddropdown.value;
    cdtextfield.value = dropdownvalue;
    let counttextfield = document.getElementById('plane' + idnumber + 'counttextfield');
    let currcountvalue = +counttextfield.value;
    let storedcountvalue = +counttextfield.dataset.storedValue;
    counttextfield.dataset.storedValue = currcountvalue;
    if (dropdownvalue === 'Don’t Use Slot'){
        cdtextfield.disabled = true;
        counttextfield.disabled = true;
        counttextfield.value = 0;
    } else if (counttextfield.disabled) {
        // restoring from "Don't use slot"
        cdtextfield.disabled = false;
        counttextfield.disabled = false;
        counttextfield.value = storedcountvalue;
    }
}

var fighters = [
    { 'value': '11.00', 'text': 'XF5U Flying Flapjack', 'name': 'xf5u-flapjack' },
    { 'value': '10.90', 'text': 'F6F Hellcat', 'name': 'hellcat' },
    { 'value': '10.81', 'text': 'F7F Tigercat', 'name': 'tigercat' },
    { 'value': '10.71', 'text': 'N1K3-A Shiden Kai', 'name': 'shiden-kai'},
    { 'value': '10.65', 'text': 'Hellcat (HVAR-mounted)', 'name': 'hvar-hellcat' },
    { 'value': '10.61', 'text': 'Sea Hornet', 'name': 'sea-hornet'},
    { 'value': '10.61', 'text': 'Sea Fury', 'name': 'sea-fury' },
    { 'value': '10.60', 'text': 'Seafang', 'name': 'seafang' },
    { 'value': '10.58', 'text': 'BF-109G Rocket Fighter', 'name': 'bf109g' },
    { 'value': '10.44', 'text': 'A7M Reppuu', 'name': 'reppuu' }, 
    { 'value': '10.20', 'text': 'VF-17 (“Pirate Squad”)', 'name': 'vf-17' }, 
    { 'value':  '9.64', 'text': 'F8F Bearcat', 'name': 'bearcat' },
    { 'value':  '9.44', 'text': 'F2A Buffalo (Thatch)', 'name': 'buffalo-thatch' },
    { 'value':  '9.24', 'text': 'Messerschmitt Me-155A', 'name': 'messerschitt' },
    { 'value':  '8.98', 'text': 'XF5F Skyrocket', 'name': 'skyrocket' },
];

var dive_bombers = [
    { 'value': '13.20', 'text': 'AD-1 Skyraider', 'name': 'skyraider' },
    { 'value': '12.00', 'text': 'J5N Tenrai', 'name': 'tenrai' },
    { 'value': '12.00', 'text': 'Prototype Su-2', 'name': 'su2' },
    { 'value': '11.91', 'text': 'XSB3C-1 (Goldiver)', 'name': 'goldiver' },
    { 'value': '11.88', 'text': 'SB2C Helldiver', 'name': 'helldiver' },
    { 'value': '11.71', 'text': 'SBD Dauntless (McClusky)', 'name': 'dauntless-mcclusky' },
    { 'value': '11.57', 'text': 'Junkers Ju-87c', 'name': 'just87c' },
    { 'value': '11.11', 'text': 'Fairey Firefly', 'name': 'firefly' },
    { 'value': '10.44', 'text': 'D4Y Suisei', 'name': 'comet' },
    { 'value': '10.38', 'text': 'Fairey Barracuda (831 Squadron)', 'name': 'cuda-831' },
    { 'value':  '9.98', 'text': 'Suisei Model 12A', 'name': 'comet-kai' },
    { 'value':  '9.18', 'text': 'Fairey Fulmar', 'name': 'fulmar' },
];

var torp_bombers = [
    { 'value': '12.50', 'text': 'VIT-2 (VK-107)', 'name': 'vit2' },
    { 'value': '12.17', 'text': 'XTB2D-1 Sky Pirate', 'name': 'skypirate' },
    { 'value': '12.04', 'text': 'TBM Avenger (VT-18)', 'name': 'vt-18', },
    { 'value': '11.64', 'text': 'Westland Wyvern', 'name': 'wyvern' },
    { 'value': '11.37', 'text': 'B7A Ryusei', 'name': 'ryusei' },
    { 'value': '11.17', 'text': 'Junkers Ju-87 D-4', 'name': 'ju-87d4' },
    { 'value': '10.97', 'text': 'Swordfish (818 Squadron)', 'name': 'swordfish-818' },
    { 'value': '10.60', 'text': 'C6N Saiun Kai Prototype', 'name': 'saiun' },
    { 'value': '10.31', 'text': 'Fairey Barracuda', 'name': 'cuda' },
    { 'value': '10.00', 'text': 'Bréguet Br.810', 'name': 'baguette-br-810', },
    { 'value':  '9.98', 'text': 'Fairey Albacore', 'name': 'albacore' },
];

var seaplanes = [
    { 'value': '14.30', 'text': 'M6A Seiran', 'name': 'seiran' },
    { 'value': '13.97', 'text': 'E16A Zuiun', 'name': 'zuiun' },
    { 'value': '12.97', 'text': 'Suisei Model 21', 'name': 'suisei-21' },
];

var other_planes = [
    { 'value': 'Don’t Use Slot', 'text': 'Don’t Use Slot', 'name': 'nouseslot'},
    { 'value': '', 'text': 'Other', 'name': 'other' },
];

function populate_node(title, data_obj){
    const node = document.createElement('optgroup');
    node.label = title;
    for (let plane of data_obj){
        const opt = document.createElement('option');
        opt.value = plane.value;
        opt.textContent = plane.text;
        if (plane.name){
            opt.setAttribute('name', plane.name);
        }
        node.appendChild(opt)
    }
    return node;
}

var f_node = populate_node('Fighters', fighters);
var db_node = populate_node('Dive Bombers', dive_bombers);
var tb_node = populate_node('Torpedo Bombers', torp_bombers);
var s_node = populate_node('Seaplanes', seaplanes);
var other_node = populate_node('Other', other_planes);

function filter_options(slot_obj, slot_number){
    let slotcount = 1;
    for (const type of ['fighters-', 'dive-bombers-', 'torpedo-bombers-', 'seaplanes-', 'other-']){
        const node = document.getElementById(type + slot_number);
        const char = type.charAt(0).toUpperCase().replace('O', 'N');
        if (char === 'N'){
            if (slot_obj.hasOwnProperty(char)){
                node.firstChild.classList.remove('hidden');
            } else {
                node.firstChild.classList.add('hidden');
            }
        } else {
            if (slot_obj.hasOwnProperty(char)){
                slotcount = slot_obj[char];
                node.classList.remove('hidden');
            } else {
                node.classList.add('hidden');
            }
        }
        
    }
    return slotcount;
}

function handle_loadout_data_impl(data){
    const params = new URL(window.location).searchParams;
    for (const field of [1, 2, 3]){
        const slot_obj = data["Slot" + field].Retrofit;
        const count = filter_options(slot_obj, field);
        const textfield = document.getElementById('plane' + field + 'counttextfield');
        textfield.value = count;
        textfield.dataset.storedValue = count;
        const choice = params.get('choice' + field);
        const preamble = '#plane' + field + 'cddropdown :not(.hidden) option';
        let element = undefined;
        if (choice) {
            const selector = preamble + '[name="' + choice + '"]';
            element = document.querySelector(selector);
        }
        if (!element) {
            const selector = preamble + ':not(.hidden)';
            element = document.querySelector(selector);
        }
        if (element) {
            element.selected = true;
        }
        update_textfields(field);
        const count_field = document.getElementById('plane' + field + 'counttextfield');
        count_field.dataset.defaultValue = count_field.value;
        const count_requested = params.get('count' + field);
        if (count_requested) {
            count_field.value = count_requested;
        }
        const cd_requested = params.get('cd' + field);
        if (choice === 'other' && cd_requested) {
            document.getElementById('plane' + field + 'cdtextfield').value = cd_requested;
        }
    }
}

var param_map = {
    'beacon': {
        'id': 'beaconbox',
        'type': 'bool',
        'default': false,
    },
    'oath': {
        'id': 'box-affinity',
        'type': 'bool',
        'default': false,
    },
    'rld-base': {
        'id': 'txt-rld-stat-base',
        'type': 'number',
        'default': 'load',
    },
    'rld-bonus': {
        'id': 'txt-rld-stat-bonus',
        'type': 'number',
        'default': 0.0,
    },
    'rld-buff': {
        'id': 'reloadbufftextfield',
        'type': 'number',
        'default': 0.0,
    },
    'cdr': {
        'id': 'cdreduction1textfield',
        'type': 'number',
        'default': 0.0,
    },
    'icdr': {
        'id': 'cdreduction2textfield',
        'type': 'number',
        'default': 0.0,
    },
};

function update_loaded_defaults() {
    for (const param in param_map) {
        const element = document.getElementById(param_map[param].id);
        if (param_map[param].default === 'load') {
            if (param === 'rld-base' && document.getElementById('box-affinity').checked) {
                element.dataset.defaultValue = get_unoath_reload(element.value, element.dataset.reloadKaiDiff);
            } else {
                element.dataset.defaultValue = element.value;
            }
        }
    }
}

function update_extrafields() {
    const params = new URL(window.location).searchParams;
    for (const param in param_map) {
        const element = document.getElementById(param_map[param].id);
        const v = params.get(param);
        if (v) {
            const element = document.getElementById(param_map[param].id);
            if (param_map[param].type === 'bool') {
                element.checked = v === 'true';
            } else {
                element.value = v;
            }
            if (param === 'oath') {
                toggle_affinity();
            }
        }
    }
}

function get_fetch_url_impl(data){
    return '/azur-lane/data/' + data.carrierJSON;
}

async function copy_permalink() {
    const url = new URL(window.location);
    const params = url.searchParams;
    const ship_choice = document.getElementById("select-ship").value;

    if (ship_choice) {
        params.set('ship', ship_choice);
    }

    for (const field of [1, 2, 3]) {
        const selector = '#plane' + field + 'cddropdown :not(.hidden) option:checked';
        const element = document.querySelector(selector);
        const name = element?.getAttribute('name');
        const defaultElement = document.querySelector('#plane' + field + 'cddropdown '
            + ' :not(.hidden) option:not(.hidden)');
        const defaultName = defaultElement?.getAttribute('name');
        if (name && name !== defaultName) {
            params.set('choice' + field, name);
            if (name === 'other') {
                params.set('cd' + field, document.getElementById('plane' + field + 'cdtextfield').value);
            }
        } else {
            params.delete('choice' + field);
        }
        const count_field = document.getElementById('plane' + field + 'counttextfield');
        if (+count_field.value !== +count_field.dataset.defaultValue) {
            params.set('count' + field, +count_field.value);
        } else {
            params.delete('count' + field);
        }
    }

    for (const param in param_map) {
        const element = document.getElementById(param_map[param].id);
        let def = param_map[param].default;
        if (def === 'load') {
            def = element.dataset.defaultValue;
        }
        if (param === 'rld-base' && document.getElementById('box-affinity').checked) {
            def = get_oath_reload(+def, +element.dataset.reloadKaiDiff);
        }
        switch (param_map[param].type) {
            case 'bool':
                // coerce into bool
                if (!element.checked !== !def) {
                    params.set(param, element.checked ? 'true' : 'false');
                } else {
                    params.delete(param);
                }
                break;
            case 'number':
                // coerce into number
                if (Math.abs(+element.value - +def) > 1e-2) {
                    params.set(param, element.value);
                } else {
                    params.delete(param);
                }
                break;
            case 'string':
                if (element.value !== def) {
                    params.set(param, element.value);
                } else {
                    params.delete(param);
                }
                break;
        }
    }
    url.search = params.toString();
    return navigator.clipboard.writeText(url.href).then(() => {
        const tag = document.getElementById('copy-permalink');
        const original = tag.textContent;
        tag.textContent = 'Copied!';
        if (original !== tag.textContent) {
            return delay(3000).then(() => {
                tag.textContent = original;
            });
        }
    });
}

function ready() {
    const params = new URL(window.location).searchParams;
    const cache = document.getElementById('select-ship-cache');
    const ship_choice = params.get('ship') || cache.value || 'Enterprise';

    for (const field of [1, 2, 3]){
        const dropdown = document.getElementById('plane' + field + 'cddropdown');
        Array.prototype.forEach.call([f_node, db_node, tb_node, s_node, other_node], (e, i) => {
            const node = e.cloneNode(true);
            node.setAttribute('id', node.label.toLowerCase().replace(' ', '-') + '-' + field);
            dropdown.appendChild(node);
        });
        update_textfields(field);
    }
    fetch('/azur-lane/data/ships/carriers.json').then((r) => {
        return r.json();
    }).then((j) => {
        handle_toc(j, ship_choice);
    });
}

document.addEventListener("DOMContentLoaded", ready);
