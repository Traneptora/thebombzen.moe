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
    { 'value': '10.90', 'text': 'F6F Hellcat', 'name': 'hellcat' },
    { 'value': '10.81', 'text': 'F7F Tigercat' },
    { 'value': '10.71', 'text': 'N1K3-A Shiden Kai' },
    { 'value': '10.61', 'text': 'Sea Hornet' },
    { 'value': '10.61', 'text': 'Sea Fury' },
    { 'value': '10.60', 'text': 'Seafang' },
    { 'value': '10.58', 'text': 'BF-109G Rocket Fighter' },
    { 'value': '10.44', 'text': 'A7M Reppuu' }, 
    { 'value': '10.20', 'text': 'VF-17 (“Pirate Squad”)' }, 
    { 'value':  '9.64', 'text': 'F8F Bearcat' },
    { 'value':  '9.44', 'text': 'F2A Buffalo (Thatch)' },
    { 'value':  '9.24', 'text': 'Messerschmitt Me-155A' },
    { 'value':  '8.98', 'text': 'XF5F Skyrocket' }, 
];

var dive_bombers = [
    { 'value': '12.00', 'text': 'J5N Tenrai' },
    { 'value': '12.00', 'text': 'Prototype Su-2' },
    { 'value': '11.91', 'text': 'XSB3C-1 (Goldiver)' },
    { 'value': '11.88', 'text': 'SB2C Helldiver', 'name': 'helldiver' },
    { 'value': '11.71', 'text': 'SBD Dauntless (McClusky)' },
    { 'value': '11.57', 'text': 'Junkers Ju-87c' },
    { 'value': '11.11', 'text': 'Fairey Firefly' },
    { 'value': '10.44', 'text': 'D4Y Suisei' },
    { 'value': '10.38', 'text': 'Fairey Barracuda (831 Squadron)' },
    { 'value':  '9.98', 'text': 'Suisei Model 12A' },
    { 'value':  '9.18', 'text': 'Fairey Fulmar' },
];

var torp_bombers = [
    { 'value': '12.50', 'text': 'VIT-2 (VK-107)'},
    { 'value': '12.17', 'text': 'XTB2D-1 Sky Pirate' },
    { 'value': '12.04', 'text': 'TBM Avenger (VT-18)' },
    { 'value': '11.64', 'text': 'Westland Wyvern' },
    { 'value': '11.37', 'text': 'B7A Ryusei', 'name': 'ryusei' },
    { 'value': '11.17', 'text': 'Junkers Ju-87 D-4' },
    { 'value': '10.97', 'text': 'Swordfish (818 Squadron)' },
    { 'value': '10.60', 'text': 'C6N Saiun Kai Prototype' },
    { 'value': '10.31', 'text': 'Fairey Barracuda' },
    { 'value': '10.00', 'text': 'Bréguet Br.810'},
    { 'value':  '9.98', 'text': 'Fairey Albacore' },
];

var seaplanes = [
    { 'value': '14.30', 'text': 'M6A Seiran' },
    { 'value': '13.97', 'text': 'E16A Zuiun' },
    { 'value': '12.97', 'text': 'Suisei Model 21' },
];

var other_planes = [
    { 'value': 'Don’t Use Slot', 'text': 'Don’t Use Slot', 'name': 'nouseslot'},
    { 'value': '', 'text': 'Other' },
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
    for (let type of ['fighters-', 'dive-bombers-', 'torpedo-bombers-', 'seaplanes-', 'other-']){
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
    for (let field of [1, 2, 3]){
        const slot_obj = data["Slot" + field].Retrofit;
        const count = filter_options(slot_obj, field);
        const textfield = document.getElementById('plane' + field + 'counttextfield');
        textfield.value = count;
        textfield.dataset.storedValue = count;
        if (!document.querySelector('#plane' + field + 'cddropdown :not(.hidden) option:not(.hidden):checked')){
            document.querySelector('#plane' + field + 'cddropdown :not(.hidden) option:not(.hidden)').selected = true;
        }
        update_textfields(field);
    }
}

function get_fetch_url_impl(data){
    return '/azur-lane/data/' + data.carrierJSON;
}

function ready() {
    for (let field of [1, 2, 3]){
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
        const cache = document.getElementById('select-ship-cache');
        handle_toc(j, cache.value ? cache.value : 'Enterprise');
    });
}

document.addEventListener("DOMContentLoaded", ready);
