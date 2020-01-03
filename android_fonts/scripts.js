function _log(logfn, str) {
  let d = new Date();
  logfn(`${d.getHours()}:${d.getMinutes()}:${d.getSeconds()}.${d.getMilliseconds()} `
        + str);
};

function log(str) {
  _log(console.log, str);
};

function err(str) {
  _log(console.error, str);
};

function indexVue() {
  return new Vue({
    el: '#app',
    data () {
      return {
        api_levels: null,
      }
    },
    mounted() {
      fetch('emoji_summary.json')
        .then((resp) => resp.json())
        .then((summary) => {
          api_levels = [];
          for (api_level in summary) {
            info = summary[api_level];
            if (info.emoji.supported == 0) continue;
            info.api_level = api_level;
            api_levels.push(info);
          }
          log(`Info available for ${api_levels.length} levels`)
          this.api_levels = api_levels;
        });
    },
    filters: {
      delta: function(value, fix) {
        if (value == null) {
          value = 0;
        }
        return (value >= 0 ? '+' : '') + value.toFixed(fix);
      },
      fixed: function(value, fix) {
        if (value == null) {
          value = 0;
        }
        return value.toFixed(fix);
      }
    },
    methods: {
      emoji_url: function(query) {
        return 'emoji.html?q=' + query;
      }
    }
  });
}

function emojiVue() {
  return new Vue({
    el: '#app',
    data () {
      return {
        all: [],
        matches: [],
        min_api: 99,
        min_font_api: 21,
        max_api: 0,
        visible_apis: [],
      }
    },
    mounted() {
      fetch('emoji_detail.json')
        .then((resp) => resp.json())
        .then((seqs) => {
          log(`Info available for ${seqs.length} seqs`)
          this.all = seqs;
          this.all.forEach(s => s.api_support.forEach(api => {
            this.min_api = Math.min(api, this.min_api);
            this.max_api = Math.max(api, this.max_api);
          }));

          // create font faces for font capable APIs
          let style = document.createElement('style');
          for (api = this.min_api; api <= this.max_api; api++) {
            if (api >= this.min_font_api) {
              let url = `api_level/${api}/NotoColorEmoji.ttf`;
              let face = new FontFace(`NotoColorEmoji.${api}`, `url(${url})`);
              document.fonts.add(face);
              // fetch all the fonts immediately in hopes of not having to wait when we need 'em
              face.load()
                  .then(_ => log(`${url} ready`))
                  .catch(e => err(`${url} ${e}`))

              cssClass = `.emoji${api} { font-family: "NotoColorEmoji.${api}", "Adobe Blank" }\n`;
            } else {
              cssClass = `.emoji${api} { font-family: "Adobe Blank" }\n`;
            }
            style.appendChild(document.createTextNode(cssClass));
          }
          document.head.appendChild(style);
        });
    },
    methods: {
      isin: function(value, sequence) {
        return sequence.indexOf(value) != -1;
      },
      emoji_css_class: function(api_level, api_support) {
        return `emoji emoji${api_level}`;
      },
      emoji_html: function(codepoints) {
        return codepoints.map(cp => '&#x' + cp.toString(16) + ';')
                         .join('');
      },
      emoji_missing_html: function() {
        return "D";
      }
    }
  });
}

function numericFilter(parseFn, raw, base) {
  if (raw.indexOf('..') != -1) {
    parts = raw.split('..');
  } else {
    parts = [raw, raw];
  }
  const lbound = parseFn(parts[0], base);
  const ubound = parseFn(parts[1], base);
  return (v) => v >= lbound && v <= ubound;
}

function makeFilter(type, raw_value) {
  var value, field, pred;
  switch(type) {
  case 'u':
    field = 'codepoints';
    value_pred = numericFilter(parseInt, raw_value, 16);
    pred = (seq) => seq.some(value_pred);
    break;
  case 'emoji':
    field = 'emoji_level';
    pred = numericFilter(parseFloat, raw_value, 10);
    break;
  case 'api':
    value = parseInt(raw_value, 10);
    field = 'api_support';
    value_pred = numericFilter(parseInt, raw_value, 10);
    pred = (seq) => seq.some(value_pred);
    break;
  case 'note':
    field = 'notes';
    let quoted = raw_value.match(/^"([^"]+)"$/);
    if (quoted != null) {
      raw_value = quoted[1]
    }
    pred = (s) => s.indexOf(raw_value) != -1;
    break;
  default:
    console.log(`Poorly formed ${type}:${raw_value}`)
    field = '_';
    pred = (_) => false;
  }
  return { 'field': field, 'pred': pred };
}

function inclusiveRange(min, max) {
  return [...Array(max - min + 1).keys()].map(e => e + min);
}

function doEmojiSearch(query) {
  activeSearch = null;
  let validFilters = [...query.matchAll(/(\w+):((?:"[^"]*")|(?:[^\s]+))/)];
  let filters = validFilters.map(t => makeFilter(t[1], t[2]));

  // Start displaying all apis then prune
  let api_filters = filters.filter(f => f.field == 'api_support');
  vm.visible_apis = inclusiveRange(vm.min_api, vm.max_api)
    .filter(api => api_filters.every(f => f.pred([api])));
  console.log(`APIs visible: ${vm.visible_apis}`);

  vm.matches = vm.all
    .filter(rec => filters.every(f => f.pred(rec[f.field])));

  if (new URLSearchParams(window.location.search).get('q') !== query) {
    history.pushState(query, "Android Emoji", `?q=${query}`);
  }
}

var activeSearch = null;
function queueEmojiSearch(e) {
  if (!!activeSearch) {
    clearTimeout(activeSearch);
    activeSearch = null;
  }
  let query = e.target.value;
  activeSearch = setTimeout(() => doEmojiSearch(query), 500);
}
