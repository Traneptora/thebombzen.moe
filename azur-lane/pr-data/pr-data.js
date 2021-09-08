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
function render_file(blob){
    if (!blob || !blob.type.startsWith('image/')){
        document.getElementById('canvas').src = 'data:,';
    } else {
        document.getElementById('canvas').src = URL.createObjectURL(blob);
    }
    validate_result();
}
function render_image(){
    const file = document.getElementById('results-screenshot').files[0];
    render_file(file);
}
window.addEventListener('paste', async function(e) {
    e.preventDefault();
    e.stopPropagation();
    const file = (e.clipboardData || e.originalEvent.clipboardData).items[0].getAsFile();
    render_file(file);
});
window.addEventListener('dragover', function(e){
    e.preventDefault();
    e.stopPropagation();
});
window.addEventListener('drop', function(e){
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.files[0]){
        render_file(e.dataTransfer.files[0]);
        return;
    }
});
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('results-screenshot').value = '';
    document.getElementById('canvas').src = 'data:,';
    name_filter();
    series_filter();
    type_filter();
});
function validate_result(){
    const valid = document.getElementById('canvas').src !== 'data:,'
    document.getElementById('submit').disabled = !valid;
    return valid;
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
    xhr.addEventListener('load', (event) => {
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
    xhr.addEventListener('error', (event) => {
        document.getElementById('server-response-status').style.display = 'block';
        document.getElementById('server-response-status').textContent = 'Unknown error occurred :(';
    });
    xhr.open('POST', '/api/v0/azur-lane/pr-data/');
    const formData = new FormData();
    formData.append('project-series', document.getElementById('project-series').value);
    formData.append('project-type', document.getElementById('project-type').value);
    formData.append('project-name', document.getElementById('project-name').value);  
    fetch(document.getElementById('canvas').src).then(r => r.blob()).then((blob) => {
        document.getElementById('server-response-status').style.display = 'block';
        document.getElementById('server-response-status').textContent = '';
        formData.append('results-screenshot', blob);
        xhr.send(formData);
    });
}
