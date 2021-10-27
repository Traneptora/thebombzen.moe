function check_validity(element, full_check){
    const id = element.id;
    const required_box = document.getElementById(id + "-required");
    if (element.validity.valid){
        required_box.classList.add("hidden");
    } else if (full_check) {
        required_box.classList.remove("hidden");
    }
}

function update_option_hiding(){
    document.querySelectorAll("#project-name option, #project-name optgroup").forEach((o) => {
        let should_show = true;
        const series_value = document.getElementById("project-series").value;
        const type_value = document.getElementById("project-type").value;
        if (o.dataset.projectSeries !== "All" && series_value !== "" && series_value !== "All" && series_value !== "unknown" && series_value !== o.dataset.projectSeries){
            should_show = false;
        } else if (o.dataset.projectType !== "All" && type_value !== "" && type_value !== "All" && type_value !== "unknown" && type_value !== o.dataset.projectType){
            should_show = false;
        }
        if (should_show){
            o.classList.remove("hidden");
        } else {
            if (o.selected){
                document.getElementById("project-name").value = "";
                name_changed();
            }
            o.classList.add("hidden");
        }
    });
}

function name_changed(){
    const project_series = document.getElementById("project-series");
    const project_type = document.getElementById("project-type");
    const project_name_option = document.querySelector("#project-name option:checked");
    if (project_series.value === "" || project_series.value === "unknown"){
        const series = project_name_option.dataset.projectSeries;
        if (series !== "" && series !== "All"){
            project_series.value = series;
            update_option_hiding();
            check_validity(project_series, false);
        }
    }
    if (project_type.value === "" || project_type.value === "unknown"){
        const type = project_name_option.dataset.projectType;
        if (type !== "" && type !== "All"){
            project_type.value = type;
            update_option_hiding();
        }
    }
    const report_color = document.getElementById("report-color");
    const report_length = document.getElementById("report-length");
    const report_cost = document.getElementById("report-cost");
    if (project_name_option.value === "" || project_name_option.value === "unknown" || project_name_option.value === "unlisted"){
        report_color.textContent = "";
        report_length.textContent = "";
        report_cost.textContent = "";
    } else {
        report_color.textContent = project_name_option.dataset.projectColor;
        report_cost.textContent = project_name_option.dataset.projectCost;
        const halfhours = +project_name_option.dataset.projectLength;
        report_length.textContent = ("00" + Math.floor(halfhours * 0.5)).slice(-2) + ":" + ("00" + Math.floor(30.0 * (halfhours % 2))).slice(-2);
    }
    if (project_name_option.value === "unlisted"){
        document.getElementById("submit").disabled = true;
        document.getElementById("error-report").classList.remove("hidden");
    } else {
        document.getElementById("submit").disabled = false;
        document.getElementById("error-report").classList.add("hidden");
    }
}

function ready(){
    document.querySelectorAll(":required").forEach((e) => e.addEventListener("invalid", (event) => {
        check_validity(event.target, true);
        event.preventDefault();
    }));
    document.querySelectorAll(":required").forEach((e) => e.addEventListener("change", (event) => {
        check_validity(event.target, false);
    }));
    document.getElementById("project-series").addEventListener("change", update_option_hiding);
    document.getElementById("project-type").addEventListener("change", update_option_hiding);
    document.getElementById("project-name").addEventListener("change", name_changed);
    update_option_hiding();
}

name_changed();

document.addEventListener("DOMContentLoaded", ready);
