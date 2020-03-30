Vue.config.performance = true;

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
          const ordered_levels = [];
          for (api_level in summary) {
            ordered_levels.push(api_level);
          }
          ordered_levels.sort();

          api_levels = [];
          ordered_levels.forEach(api_level => {
            info = summary[api_level];
            if (info.emoji.supported == 0) return;
            info.api_level = api_level;
            api_levels.push(info);
          });
          log(`Info available for ${api_levels.length} levels`);

          this.api_levels = api_levels;

          // Set delta to all of them for the earliest API we know about
          const earliest = api_levels[0]['emoji'];
          earliest.delta = earliest.supported;

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
        match_len: 0,
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
          log(`Info available for ${seqs.length} seqs`);

          this.all = Object.freeze(seqs);
          for (const s of this.all) {
            for (const api of s.api_support) {
              this.min_api = Math.min(api, this.min_api);
              this.max_api = Math.max(api, this.max_api);
            }
          }

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
              cssClass = `.emoji${api} { width: 100%; height: 100%; }\n`;
            }
            style.appendChild(document.createTextNode(cssClass));
          }
          document.head.appendChild(style);
        });
    }, // end mounted
    methods: {
      emoji_css_class: function(emoji, api_level) {
        cssClass = 'emoji';
        if (emoji.api_support.indexOf(api_level) != -1) {
          cssClass += ` emoji${api_level}`;
        }
        return cssClass;
      },
      emoji_html: function(emoji, api_level) {
        if (emoji.api_support.indexOf(api_level) == -1) {
          return "";
        }
        if (api_level >= vm.min_font_api) {
          return emoji.codepoints
                      .map(cp => '&#x' + cp.toString(16) + ';')
                      .join('');
        }
        // supported but no font, there should be an image
        return '<img src="./api_level/'
              + api_level.toString()
              + '/emoji_u'
              +  emoji.codepoints
                      .map(cp => cp.toString(16).padStart(4, '0'))
                      .join('_')
              + '.svg"></img>';
      },
      codepoint_html: function(emoji) {
        return emoji.codepoints
                    .map(cp => 'U+' + cp.toString(16) + '')
                    .join(' ');
      }
    } // end methods
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
  case 'api_added':
    field = 'api_support';
    value_pred = numericFilter(parseInt, raw_value, 10);
    pred = (seq) => value_pred(seq[0]);
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
  const startTime = Date.now();

  // clear the active search ref, we're doing it now
  activeSearch = null;

  // clear current results
  vm.matches = []
  let dynStyles = document.getElementById('dynamic_styles');
  while (dynStyles.hasChildNodes()) {
    dynStyles.removeChild(dynStyles.firstChild);
  }

  // Just bash it with a regex, no need to be fancy
  let validFilters = [...query.matchAll(/(\w+):((?:"[^"]*")|(?:[^\s]+))/g)];
  let filters = validFilters.map(t => makeFilter(t[1], t[2]));

  // Start displaying all apis then prune
  let api_filters = filters.filter(f => f.field == 'api_support');
  vm.visible_apis = inclusiveRange(vm.min_api, vm.max_api)
    .filter(api => api_filters.every(f => f.pred([api])))
    .filter(api => api != 20);  // 20 doesn't exist

  // Build styles for display of the new results
  rowStyle = '#results, item {\n'
           + '  display: grid;\n'
           + '  grid-gap: 0.1em;\n'
           + `  grid-template-columns: repeat(${vm.visible_apis.length}, 4em)`
           + ' minmax(4em, 1fr)' // codepoints column
           + ' minmax(6em, 3fr)' // notes column
           + ';\n'
           + '}\n'
           ;
  dynStyles.appendChild(document.createTextNode(rowStyle));

  // update Vue, triggering UI refresh
  // limit max rows because grid was insanely slow with large set
  let matches = vm.all
                  .filter(emoji => filters.every(f => f.pred(emoji[f.field])));
  vm.match_len = matches.length;
  vm.matches = matches;

  if (new URLSearchParams(window.location.search).get('q') !== query) {
    history.pushState(query, "Android Emoji", `?q=${query}`);
  }

  const endTime = Date.now();
  log(`doEmojiSearch took ${(endTime - startTime)} ms ${query} has ${vm.matches.length} results`)
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
