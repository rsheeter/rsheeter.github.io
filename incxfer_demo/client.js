(function() {
  let currentFont = null;
  let fontInfos = null;
  let host = 'https://fonts.gstatic.com';

  function div() {
    return document.createElement('div');
  }

  function removeAllChildren(el) {
    while (el.lastChild) {
      el.removeChild(el.lastChild);
    }
  }

  function codepoints(str) {
    return new Set(Array.from(str).map(s => s.codePointAt(0)));
  }

  function prepend(el, str) {
    let newDiv = div();
    newDiv.innerText = str;
    el.insertBefore(newDiv, el.firstChild);
  }

  function log(str) {
    let d = new Date();
    console.log(`${d.getHours()}:${d.getMinutes()}:${d.getSeconds()}.${d.getMilliseconds()} `
                + str);
  }

  function createFontInfo(font_size, woff2_size, patch_size, codepoint_size,
                          gf_subsets) {
    return {
      'font_size': font_size,
      'woff2_size': woff2_size,
      'patch_size': patch_size,
      'codepoint_size': codepoint_size,
      'gf_subsets': gf_subsets
    };
  }

  function appendSizeSeq(suffix_fn, max_sz, seq) {
    let container = document.getElementById('metric_container');
    let metrics = div();
    metrics.className = 'metrics';
    seq.forEach((byte_size) => {
      let metric = div();
      metric.className = 'metric';
      let kb_sz = (byte_size / 1024.0).toFixed(1);
      let desc = `[${kb_sz} KB ${suffix_fn()}]`;
      metric.style = `width: ${100.0 * byte_size / max_sz}%;`;
      metric.title = desc;
      metric.innerText = desc;
      metrics.appendChild(metric);
    });
    container.appendChild(metrics);
  }

  function addFontInfo(fontInfo) {
    fontInfos.push(fontInfo);
    let container = document.getElementById('metric_container');
    removeAllChildren(container);

    let cp_desc = div();
    let num_cp = fontInfos.reduce((a, c) => a + c.codepoint_size, 0);
    cp_desc.innerText = '' + num_cp + ' codepoints'
      + (fontInfos.length > 1 ? ` (${fontInfos.map(f => f.codepoint_size).join(' + ')})` : '')
      + ' in Demo Content';
    container.appendChild(cp_desc);

    container.appendChild(document.createElement('br'));

    let xfer_opts = div();
    xfer_opts.innerText = 'Options:';
    xfer_opts.className = 'transfer_options';
    container.appendChild(xfer_opts);

    let gf_desc = div();
    let gf_subset_seq = fontInfo.gf_subsets.map(s => s.woff2_size);
    let gf_xfer_sz = gf_subset_seq.reduce((a,c) => a + c);
    gf_desc.innerText = 'A) What GF would send today, '
        + `∑size ${(gf_xfer_sz / 1024.0).toFixed(1)} KB:`;

    container.appendChild(gf_desc);
    let gf_subset_names = fontInfo.gf_subsets.map(s => s.name);
    appendSizeSeq(() => gf_subset_names.shift(), gf_xfer_sz, gf_subset_seq);

    let patch_seq = fontInfos.map(fi => fi.patch_size);
    let patch_sz = (patch_seq.reduce((a,c) => a + c) / 1024.0).toFixed(1);
    let max_sz = Math.max(fontInfo.woff2_size, fontInfo.font_size,
                          patch_seq.reduce((a, c) => a+c),
                          gf_subset_seq.reduce((a,c) => a+c));

    let desc = div();
    desc_text = `B) Incremental Transfer. ∑patches ${patch_sz} KB:`;
    desc.innerText = desc_text;

    container.appendChild(desc);
    appendSizeSeq(() => 'patch', max_sz, patch_seq);

    let woff2_desc = div();
    woff2_desc.innerText = 'C) Optimal, woff2 of the exact subset:';
    container.appendChild(woff2_desc);
    appendSizeSeq(() => 'woff2', max_sz, [fontInfo.woff2_size]);
  }

  function addDemoText(str) {
    if (!!!str) return;
    log('Add "' + str + '"');
    let demo_text = document.getElementById('demo_text');
    let add_container = document.getElementById('add_container');
    let cp_current = codepoints(demo_text.innerText);
    prepend(add_container, str);
    let cp_needed = codepoints(demo_text.innerText);
    cp_current.forEach(c => cp_needed.delete(c));
    if (cp_needed.size > 0) {
      beginUpdateFont(document.getElementById('font_spec').value, cp_current, cp_needed);
    } else {
      log('nop, same cps');
    }
  }

  function requestBinary(path, method='GET') {
    let url = host + path;
    let req = new XMLHttpRequest();
    req.responseType = 'arraybuffer';
    req.open(method, url, true);
    log(method + ' ' + url);
    return req;
  }

  function updateFont(new_font) {
    currentFont = new_font;
    let blob = new Blob([currentFont]);
    let fontDataUrl = window.URL.createObjectURL(blob);
    log(currentFont.byteLength + ' byte current font, data url ' + fontDataUrl);

    let face = document.createTextNode('@font-face {\
        font-family: "IncXFer";\
        src: url(\'' + fontDataUrl + '\');\
      }\n');
    let faceStyle = document.getElementById('face_holder');
    while (faceStyle.hasChildNodes()) {
      faceStyle.removeChild(faceStyle.firstChild);
    }
    faceStyle.appendChild(face);
  }

  function applyPatch(fontInfo, patch, diff_type) {
    let data = new Uint8Array(currentFont.byteLength + patch.byteLength);
    for (i = 0; i < currentFont.byteLength; i++) {
      data[i] = currentFont[i];
    }
    for (i = 0; i < patch.byteLength; i++) {
      data[currentFont.byteLength + i] = patch[i];
    }

    let params = [
      'source_length=' + currentFont.byteLength,
      'diff_type=' + diff_type
    ];
    let req = requestBinary('/experimental/patch?' + params.join('&'), 'POST');
    req.onload = function(e) {
      if (req.status != 200) {
        log('Error, response code ' + req.status);
        return;
      }
      if (!req.response) {
        log('Error, empty response');
        return;
      }
      let raw_response = new Uint8Array(req.response);
      log(raw_response.byteLength + ' byte patched font. Woff2 size ' + fontInfo.woff2_size);

      updateFont(raw_response);

      fontInfo.font_size = currentFont.byteLength;
      fontInfo.patch_size = patch.byteLength;
      addFontInfo(fontInfo);
    };
    req.send(data);
  }

  function beginUpdateFont(font_spec, cp_current, cp_needed) {
    let diff_type = document.querySelector('input[name="difftype"]:checked').value;
    let params = [
      'font=' + font_spec,
      'cp_current=' + Array.from(cp_current).join(','),
      'cp_needed=' + Array.from(cp_needed).join(','),
      'diff_type=' + diff_type
    ];
    if (cp_current.size == 0) {
      log('Request initial font, ' + cp_needed.size + ' codepoints from ' + font_spec);
    } else {
      log('Request delta using ' + diff_type + ', +' + cp_needed.size + ' codepoints from ' + font_spec);
    }
    let req = requestBinary('/experimental/incxfer?' + params.join('&'));
    req.onload = function(e) {
      if (req.status != 200) {
        log('Error, response code ' + req.status);
        return;
      }
      if (!req.response) {
        log('Error, empty response');
        return;
      }
      let raw_response = new Uint8Array(req.response);
      let mode = req.getResponseHeader('incxfer_mode');
      let woff2_sz = parseInt(req.getResponseHeader('incxfer_woff2_needed'));
      let gf_subsets = req.getResponseHeader('incxfer_subset_sizes')
        .split(', ')
        .map(s => s.split(': '))
        .map(arr => ({'name': arr[0], 'woff2_size': parseInt(arr[1])}));
      log('Received ' + raw_response.byteLength + ' byte ' + mode);
      log('A woff2 of the font is ' + woff2_sz + ' bytes');

      let fontInfo = createFontInfo(raw_response.byteLength, woff2_sz, woff2_sz, cp_needed.size, gf_subsets);
      if (mode === 'font') {
        updateFont(raw_response);
        addFontInfo(fontInfo);
      } else {
        applyPatch(fontInfo, raw_response, diff_type);
      }

    };
    req.send();
  }

  function fullReset() {
    currentFont = null;
    fontInfos = [];
    removeAllChildren(document.getElementById('metric_container'));
    removeAllChildren(document.getElementById('add_container'));

    beginUpdateFont(document.getElementById('font_spec').value, new Set(),
      codepoints(document.getElementById('demo_text').innerText))
  }

  window.addEventListener('DOMContentLoaded', function() {
    let samples = {
      'Add Latin 1': 'HARFBUZZ FTW',
      'Add Latin 2': 'I used to be a coder like you until I took an ARROW in the KNEE!',
      'Add Latin 3': 'All their equipment and instruments are alive.',
      'Add Latin 4': 'It was going to be a lonely trip back.',
      'Add Cyrillic 1': 'Развернувшееся зрелище и впрямь было грандиозным.',
      'Add Cyrillic 2': 'Я дивився на шторм – неймовірно красивий і жахаючий.',
      'Add Vietnamese 1': 'Vật thể giống một mảng cỏ màu tím, rộng năm foot vuông, đang di chuyển trên cát về phía họ. Khi nó đến gần, anh thấy không phải là cỏ; không có lá mà chỉ là chùm rễ màu tím. Chùm rễ đang xoay tròn như những nan hoa của bánh xe không vành.',
      'Add Vietnamese 2': 'Đó là hành trình tuyệt vời. Tôi gặp nhiều người tôi quý mến ngay từ đầu nhưng cũng có người tôi không muốn gặp lại; họ đều phải bảo vệ Redoubt. Ở mọi nơi tôi đặt chân tới, chúng tôi đi nhiều và có rất nhiều người để gặp nhưng thời gian thì có hạn.',
      'Add Japanese 1': '各部位を正確に作るには時間がかかるので、当初の意図とは異なるが、巨大な人体を作ることにした。高さは約 8 フィートで、これに釣り合う体格だ。これを決断し、数か月にわたって材料を集め整理した後、作業を開始した。',
      'Add Japanese 2': '5 平方フィート程度の紫色の草むらのようなものが、砂地を横切ってこちらに向かってきた。近くから見ると草ではないようだった。葉はなく紫色の根だけがある。その根が回転し、小さな草の集まりがそれぞれ縁のない車輪のようだった。'
    };

    sample_container = document.getElementById('add_samples');
    for (label in samples) {
      let sample = samples[label];
      btn = document.createElement('button');
      btn.appendChild(document.createTextNode(label));
      btn.addEventListener('click', function() { addDemoText(sample); });
      sample_container.appendChild(btn);
    }

    document.getElementById('add_arbitrary')
      .addEventListener('click', function() { addDemoText(document.getElementById('arbitrary').value); });

    document.getElementById('font_spec')
      .addEventListener('change', fullReset);

    fullReset();
  });
})();
