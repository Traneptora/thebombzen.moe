#!/usr/bin/env bash
set -o pipefail
set -m

check_and_push(){
    filename="$1"
    ext="$2"
    original="$3"
    project_series="$4"
    project_type="$5"
    project_name="$6"
    filesize="$(stat -c%s "$filename")"
    checksum="$(convert <"$filename" 2>/dev/null - RGBA:- | sha384sum - | xxd -r -p | base64 --wrap=0 | tr '+/' '-_')"
    status="$?"
    # OLBgp1GsljhM2TJ-sbHjaiH9txEUvgdDTAzHv2P24donTt6_529l-9Ua0vFImLlb is the checksum of an empty file
    if ! [ "$status" = "0" ] || [ -z "$checksum" ] || [ "$checksum" = "OLBgp1GsljhM2TJ-sbHjaiH9txEUvgdDTAzHv2P24donTt6_529l-9Ua0vFImLlb" ] ; then
        rm >&2 -f -v -- "$filename"
        printf >&2 'image-checksum failed: %s\n' "$original"
        printf 'color: %s\nstatus: %s\nextra: %s\n' 'error' 'Invalid upload.' 'Unsupported file.'
        return 1
    fi
    dirname="${this_dir}/pr-data/uploads"
    # json manifest
    json_file="${dirname}/${checksum}.meta.json"
    cached_message_id=""
    now_time="$(date -u +%s)"
    if [ -f "$json_file" ] ; then
        printf >&2 'Duplicate found: %s\n' "$checksum"
        rm >&2 -f -v -- "$filename"
        cp "$json_file" "${json_file}.cache"
        cached_series="$(jq -r <"$json_file" '.["project-series"]')"
        cached_name="$(jq -r <"$json_file" '.["project-name"]')"
        cached_message_id="$(jq -r <"$json_file" '.["message-id"]')"
        cached_crtime="$(jq -r <"$json_file" '.["crtime"]')"
        if [ "$cached_series" = "$project_series" ] && [ "$cached_name" = "$project_name" ] ; then
            printf >&2 'Duplicate is exact: %s\n' "$checksum"
            printf 'color: %s\nstatus: %s\nextra: %s\n' 'ok' 'Exact duplicate uploaded.' 'No action was performed.'
            rm >&2 -f -v -- "${json_file}.cache"
            return 0
        else
            printf 'color: %s\nstatus: %s\nextra: Project Series: %s, Project Name: %s\n' 'ok' 'Metadata updated.' "$project_series" "$project_name"
            printf >&2 'Reupload, changing metadata: %s\n' "$checksum"
        fi
    else
        printf 'color: %s\nstatus: %s\nextra: Project Series: %s, Project Name: %s\n' 'ok' 'Upload completed successfully.' "$project_series" "$project_name"
        printf >&2 'New image found: %s\n' "$checksum"
        printf '{"crtime": "%d"}' "$now_time" >"${json_file}.cache"
    fi
    cat <"${json_file}.cache" |\
    jq --arg key 'checksum' --arg value "$checksum" '. | .[$key]=$value' |\
    jq --arg key 'original' --arg value "$original" '. | .[$key]=$value' |\
    jq --arg key 'extension' --arg value "$ext" '. | .[$key]=$value' |\
    jq --arg key 'filename' --arg value "${checksum}${ext}" '. | .[$key]=$value' |\
    jq --arg key 'dirname' --arg value "$dirname" '. | .[$key]=$value' |\
    jq --arg key 'project-series' --arg value "$project_series" '. | .[$key]=$value' |\
    jq --arg key 'project-type' --arg value "$project_type" '. | .[$key]=$value' |\
    jq --arg key 'project-name' --arg value "$project_name" '. | .[$key]=$value' |\
    jq --arg key 'mtime' --arg value "$now_time" '. | .[$key]=$value' |\
    jq --arg key 'size' --arg value "$filesize" '. | .[$key]=$value' |\
    jq -c '.' >"$json_file"
    webhook="$(gzip -c -d - <"${this_dir}/webhook_url" | base64 --wrap=0 | tr '+/' '-_' | tr -d '=' | sed -r 's:^([0-9]+)_(.*).{4}:\1/\2:')"
    if [ -z "$cached_message_id" ] ; then
        content="$(printf 'Original: `%s`\nChecksum: `%s\n`Upload Timestamp: <t:%d>\nProject Type: `%s`\nProject Series: `%s`\nProject Name: `%s`\n' "$original" "$checksum" "$now_time" "$project_type" "$project_series" "$project_name")"
        _upload "$webhook" "$filename" "$checksum" "$ext" "$content" "$json_file" </dev/null >>"${dirname}/uploads.log" 2>&1 &
    else
        content="$(printf 'Original: `%s`\nChecksum: `%s\n`Upload Timestamp: <t:%d>\nEdit Timestamp: <t:%d>\nProject Type: `%s`\nProject Series: `%s`\nProject Name: `%s`\n' "$original" "$checksum" "$cached_crtime" "$now_time" "$project_type" "$project_series" "$project_name")"
        curl >&2 -sS --request PATCH --header 'Content-Type: multipart/form-data' --url "https://discord.com/api/webhooks/${webhook}/messages/${cached_message_id}" --form content="$content"
        rm >&2 -f -v -- "${json_file}.cache"
    fi
    chmod 644 -- "$json_file"
}

_upload(){
    webhook="$1"
    filename="$2"
    checksum="$3"
    ext="$4"
    content="$5"
    json_file="$6"
    message_id="$(curl -sS --request POST --header 'Content-Type: multipart/form-data' --url "https://discord.com/api/webhooks/${webhook}" --form file="@${filename}; filename=pr-data_${checksum}${ext}" --form content="$content" | jq -r '.["id"]')"
    jq --arg value "$message_id" '. | .["message-id"]=$value' <"$json_file" >"${json_file}.cache"
    mv -f -v -- "${json_file}.cache" "$json_file"
    rm -f -v -- "$filename"
}

this_dir="$(dirname "$0")"
input_filename="$1"
original_filename="$2"
project_series="$3"
project_type="$4"
project_name="$5"
original_filename="${original_filename##*/}"
file_extension="${original_filename#"${original_filename%.*}"}"
if [ -z "${file_extension#.}" ] ; then
    file_extension=".$(file --brief --extension - <"$input_filename" | awk -F'/' '{print $1}')"
fi
check_and_push "$input_filename" "$file_extension" "$original_filename" "$project_series" "$project_type" "$project_name"
