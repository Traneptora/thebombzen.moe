// Load this first

var ship_list = [];
var ship_dict = {};

function roundBase10(value, digits = 2){
    const power_ten = Math.pow(10.0, digits > 0 ? digits : -digits);
    const rounded = Math.round(value * power_ten) / power_ten;
    const str = rounded.toString();
    if (digits > 0){
        const index = str.indexOf(".");
        if (index < 0){
            return str + "." + "0".repeat(digits);
        } else {
            return str.slice(0, index + 1) + (str.slice(index + 1) + "0".repeat(digits)).slice(0, digits);
        }
    } else {
        return str;
    }
}

function get_oath_reload(reload, reload_kai_diff){
    return (reload - reload_kai_diff) * 1.056603774 + reload_kai_diff;
}

function get_unoath_reload(reload_oath, reload_kai_diff){
    return (reload_oath - reload_kai_diff) * 0.946428571 + reload_kai_diff;
}

/*
 * The units here for reload are un-oathed reload, regardless
 * of whether or not the box is checked
 */
function update_reload_stat(reload){
    const oath = document.getElementById("box-affinity").checked;
    const reload_stat_txt = document.getElementById("txt-rld-stat-base");
    const reload_kai_diff = +reload_stat_txt.dataset.reloadKaiDiff;
    const reload_stat = oath ? get_oath_reload(reload, reload_kai_diff) : reload;
    reload_stat_txt.value = roundBase10(reload_stat, -2);
    reload_stat_txt.dataset.reload = reload_stat;
    calculate_reload();
}

function toggle_affinity(){
    const oath = document.getElementById("box-affinity").checked;
    const reload_stat_txt = document.getElementById("txt-rld-stat-base");
    const reload_kai_diff = +reload_stat_txt.dataset.reloadKaiDiff;
    const saved_reload = +reload_stat_txt.dataset.reload;
    const value = +reload_stat_txt.value;
    // if user did not change it, use saved value for full precision
    const reload = roundBase10(saved_reload, -1) === value ? saved_reload : value;
    // in all cases we want to pass the unoathed reload
    const unoath_reload = oath ? reload : get_unoath_reload(reload, reload_kai_diff);
    update_reload_stat(unoath_reload);
}

function handle_toc(data, default_ship){
    if (ship_list.length > 0){
        return;
    }
    for (let ship of data.ships){
        ship_list.push(ship.Name);
        ship_dict[ship.Name] = ship;
    }
    ship_list.sort();
    ship_list.push("Other");
    ship_dict["Other"] = {};
    const ship_select = document.getElementById("select-ship");
    for (let ship_name of ship_list){
        const option = document.createElement('option');
        option.name = ship_name;
        option.value = ship_name;
        option.appendChild(document.createTextNode(ship_name));
        ship_select.appendChild(option);
        if (ship_name === default_ship){
            option.selected = true;
        }
    }
    acquire_loadout();
}

/*
 * Handle Your Own Specific Data!!
 * Implement handle_loadout_data_impl(data)
 */
function handle_loadout_data(data){
    handle_loadout_data_impl(data);
    const reloadDiff = (+data.Reload) - (+data.ReloadUnkai);
    document.getElementById("txt-rld-stat-base").dataset.reloadKaiDiff = reloadDiff;
    update_reload_stat(+data.Reload);
    calculate_reload();
}

function acquire_loadout(){
    const ship_select = document.getElementById("select-ship");
    const ship_name = ship_select.value;
    const previous_ship = ship_select.dataset.previousShip;
    if (ship_name === "Other" && previous_ship !== "Other"){
        const general_loadout = {"F": "1", "D": "1", "T": "1", "S": "1", "N": "1"};
        const other_obj = {
            "Name" : "Other",
            "Reload": 100,
            "ReloadUnkai": 100,
            "Slot1":{"Retrofit":general_loadout},
            "Slot2":{"Retrofit":general_loadout},
            "Slot3":{"Retrofit":general_loadout},
        };
        ship_dict["Other"].ship_info = other_obj;
        handle_loadout_data(other_obj);
        update_reload_stat(100);
        calculate_reload();
    } else if (ship_name !== previous_ship) {
        const handle_data = (data) => {
            
        };
        if (ship_dict[ship_name].ship_info){
            handle_loadout_data(ship_dict[ship_name].ship_info);
        } else {
            const fetch_url = get_fetch_url_impl(ship_dict[ship_name]);
            fetch(fetch_url).then((response) => {
                return response.json();
            }).then((data) => {
                ship_dict[data.Name].ship_info = data;
                handle_loadout_data(data);
            });
        }
    }
    ship_select.dataset.previousShip = ship_name;
    document.getElementById('select-ship-cache').value = ship_select.value;
}
