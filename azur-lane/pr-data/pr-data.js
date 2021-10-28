var h64raw;
import('/js/xxhash-wasm@0.4.2.js').then(async (h) => {
    h64raw = (await (h.default())).h64Raw;
});

function series_filter(){
    document.getElementById('main').dataset.filterSeries = document.getElementById('project-series').value;
}

function type_filter(){
    document.getElementById('main').dataset.filterType = document.getElementById('project-type').value;
}

function name_filter(){
    const checked = document.querySelector('#project-name option:checked');
    document.getElementById('report-color').textContent = checked.dataset.projectColor;
    document.getElementById('report-length').textContent = checked.dataset.projectLength;
    document.getElementById('report-cost').textContent = checked.dataset.projectCost;
    document.getElementById('main').dataset.projectName = checked.value;
    if (checked.value === '' || checked.value === 'unknown' || checked.value === 'unlisted'){
        return; // my work here is done.  but you did't do anything. *swooshes cape*
    }
    const series = document.getElementById('project-series');
    if ((series.value === '' || series.value === 'unknown') && checked.dataset.projectSeries !== "all"){
        series.value = checked.dataset.projectSeries;
        series_filter();
    }
    const type = document.getElementById('project-type');
    if (type.value === '' || type.value === 'unknown' && checked.dataset.projectType !== "all"){
        type.value = checked.dataset.projectType;
        type_filter();
    }
}

function conditional_class(condition, className, element) {
    if (condition){
        element.classList.add(className);
    } else {
        element.classList.remove(className);
    }
    return condition;
}

function validate_result(){
    const src = document.getElementById('canvas').src;
    let valid = !conditional_class(!src || src === 'data:,', 'rust', document.getElementById('results-screenshot').parentElement.firstElementChild);
    valid = Array.prototype.map.call(document.querySelectorAll('#project-series, #project-name'),
        el => !conditional_class(!el.value, 'rust', el.parentElement.firstElementChild)
    ).reduce((a, b) => a && b, true) && valid;
    document.getElementById('submit').disabled = !valid;
    return valid;
}

function display_blob(blob){
    const url = blob && blob.type.startsWith('image/') ? URL.createObjectURL(blob) : 'data:,';
    document.getElementById('canvas').src = url;
    if(document.getElementById('submit').disabled && url !== 'data:,'){
        validate_result();
    }
}

function render_image(){
    const file = document.getElementById('results-screenshot').files[0];
    display_blob(file);
}

function suppress(e) {
    e.preventDefault();
    e.stopPropagation();
}

function submit_result(){
    if (!validate_result()){
        return;
    }
    document.getElementById('submit').disabled = true;
    const xhr = new XMLHttpRequest();
    xhr.upload.addEventListener('progress', (event) => {
        const disp = document.getElementById('server-response-status');
        if (event.lengthComputable){
            const percent = 100.0 * (+event.loaded / +event.total);
            if (percent >= 100.0){
                disp.textContent = 'Upload complete. Processing...';
            } else {
                disp.textContent = 'Uploading... ' + percent.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2}) + ' percent complete.';
            }
        } else {
            disp.textContent = 'Uploading... unknown percent complete.';
        }
    });

    xhr.addEventListener('load', async (e) => {
        const disp = document.getElementById('server-response-status');
        disp.style.display = 'block';
        const response = JSON.parse(xhr.response);
        if (response.success){
            disp.textContent = response.status + ' ' + response.extra;
        } else {
            disp.textContent = 'Backend error occurred, try again later.';
        }
        document.getElementById('submit').disabled = false;
    });

    xhr.addEventListener('error', async (e) => {
        document.getElementById('server-response-status').style.display = 'block';
        document.getElementById('server-response-status').textContent = 'Unknown error occurred :(';
    });

    xhr.open('POST', '/api/v0/azur-lane/pr-data/');

    const formData = new FormData();
    formData.append('action', 'submit');
    formData.append('project-series', document.getElementById('project-series').value);
    formData.append('project-type', document.getElementById('project-type').value);
    formData.append('project-name', document.getElementById('project-name').value);  
    return fetch(document.getElementById('canvas').src).then(r => r.blob()).then((blob) => {
        return blob.arrayBuffer().then((b) => {
            return Array.from(h64raw(new Uint8Array(b), 0, 0)).map(i => i.toString(16)).join('').toLowerCase();
        }).then((h) => {
            document.getElementById('server-response-status').style.display = 'block';
            document.getElementById('server-response-status').textContent = '';
            formData.append('client-xxhash', h);
            formData.append('results-screenshot', blob);
            xhr.send(formData);
        });
    });
}

window.addEventListener('paste', async (e) => {
    suppress(e);
    const file = (e.clipboardData || e.originalEvent.clipboardData).items[0];
    if (file){
        display_blob(file.getAsFile());
    }
});

window.addEventListener('dragover', suppress);

window.addEventListener('drop', async (e) => {
    suppress(e);
    if (e.dataTransfer.files[0]){
        display_blob(e.dataTransfer.files[0]);
    }
});

document.addEventListener('DOMContentLoaded', async () => {
    document.getElementById('results-screenshot').value = '';
    document.getElementById('canvas').src = 'data:,';
    const v = (e) => {
        if (document.getElementById('submit').disabled && e.target.value){
            validate_result();
        }
    };
    document.querySelectorAll('#project-series, #project-name').forEach(el => el.addEventListener('change', v));
    name_filter();
    series_filter();
    type_filter();
});
