const h64promise = import('/js/xxhash-wasm@0.4.2.js').then(h => h.default()).then((d) => {
    return d.h64Raw;
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
    const src = document.getElementById('source-image').src;
    let valid = !conditional_class(!src || src === 'data:,', 'rust', document.getElementById('results-screenshot').parentElement.firstElementChild);
    valid = Array.prototype.map.call(document.querySelectorAll('#project-series, #project-name'),
        el => !conditional_class(!el.value, 'rust', el.parentElement.firstElementChild)
    ).reduce((a, b) => a && b, true) && valid;
    document.getElementById('submit').disabled = !valid;
    return valid;
}

async function get_canvas_blob(){
    return new Promise((resolve, reject) => {
        const callback = (blob) => {
            resolve(blob);
        };
        document.getElementById('canvas').toBlob(callback, 'image/png');
    });
}

async function get_canvas_xxh(blob){
    let ab;
    if (blob){
        ab = blob.arrayBuffer();
    } else {
        ab = get_canvas_blob().then(b => b.arrayBuffer());
    }
    const h64raw = await h64promise;
    return ab.then(b => Array.from(h64raw(new Uint8Array(b), 0, 0)).map(i => i.toString(16)).join('').toLowerCase());
}

async function check_upload(xxh){
    const checkFormData = new FormData();
    checkFormData.set('action', 'check');
    checkFormData.set('client-xxhash', xxh);
    return fetch('/api/v0/azur-lane/pr-data/', {
        method: 'POST',
        mode: 'cors',
        cache: 'no-cache',
        credentials: 'omit',
        referrerPolicy: 'no-referrer',
        body: checkFormData,
    }).then(r => r.json());
}

async function acquire_source(blob){
    const url = blob && blob.type.startsWith('image/') ? URL.createObjectURL(blob) : 'data:,';
    const origImage = document.getElementById('source-image');
    origImage.src = url;
}

async function source_loaded(){
    const origImage = document.getElementById('source-image');
    if (origImage.src === 'data:,') {
        return;
    }
    const autoCrop = document.getElementById('box-autocrop').checked;
    const canvas = document.getElementById('canvas');
    const context = canvas.getContext('2d');
    if (autoCrop) {
        if (origImage.naturalWidth * 9 > origImage.naturalHeight * 16) {
            /* wider than 16:9 */
            canvas.width = origImage.naturalHeight * 8 / 9;
            canvas.height = origImage.naturalHeight * 2 / 3;
        } else if (origImage.naturalWidth * 9 < origImage.naturalHeight * 16) {
            canvas.width = origImage.naturalWidth / 2;
            canvas.height = origImage.naturalWidth * 3 / 8;
        }
    } else {
        canvas.width = origImage.naturalWidth;
        canvas.height = origImage.naturalHeight;
    }
    const origX = (origImage.naturalWidth - canvas.width) / 2;
    const origY = (origImage.naturalHeight - canvas.height) / 2;
    context.drawImage(origImage, origX, origY, canvas.width, canvas.height, 0, 0, canvas.width, canvas.height);
    return get_canvas_xxh().then(xxh => check_upload(xxh)).then((j) => {
        if (j.cacheHit){
            document.getElementById('project-series').value = j.projectSeries;
            document.getElementById('project-type').value = j.projectType;
            document.getElementById('project-name').value = j.projectName;
        } else {
            document.getElementById('project-series').value = '';
            document.getElementById('project-type').value = '';
            document.getElementById('project-name').value = '';
        }
        name_filter();
        series_filter();
        type_filter();
    }).then(() => {
        if(document.getElementById('submit').disabled && origImage.src !== 'data:,'){
            validate_result();
        }
    });
}

async function render_image(){
    const file = document.getElementById('results-screenshot').files[0];
    await acquire_source(file);
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
        disp.textContent = (response.status || 'Error:') + ' ' + (response.extra || 'Backend error occurred, try again later.');
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

    return get_canvas_blob()
        .then((blob) => {
            formData.append('results-screenshot', blob);
            return get_canvas_xxh(blob);
        }).then((h) => {
            formData.set('client-xxhash', h);
            return check_upload(h);
        })
        .then((j) => {
            console.log(j);
            if (j.cacheHit){
                formData.delete('results-screenshot');
                formData.set('use-cached-upload', true);
            }
            document.getElementById('server-response-status').style.display = 'block';
            document.getElementById('server-response-status').textContent = '';
            return xhr.send(formData);
        });
}

window.addEventListener('paste', async (e) => {
    suppress(e);
    const file = (e.clipboardData || e.originalEvent.clipboardData).items[0];
    if (file){
        await acquire_source(file.getAsFile());
    }
});

window.addEventListener('dragover', suppress);

window.addEventListener('drop', async (e) => {
    suppress(e);
    if (e.dataTransfer.files[0]){
        await acquire_source(e.dataTransfer.files[0]);
    }
});

document.addEventListener('DOMContentLoaded', async () => {
    document.getElementById('results-screenshot').value = '';
    document.getElementById('source-image').src = 'data:,';
    const v = (e) => {
        if (document.getElementById('submit').disabled && e.target.value){
            validate_result();
        }
    };
    document.querySelectorAll('#project-series, #project-name').forEach(el => el.addEventListener('change', v));
    name_filter();
    series_filter();
    type_filter();
    document.getElementById('source-image').addEventListener('load', source_loaded);
    document.getElementById('box-autocrop').addEventListener('change', source_loaded);
});
