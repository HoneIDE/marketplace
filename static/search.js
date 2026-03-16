/* Hone Marketplace — client-side enhancements */
(function () {
  'use strict';

  // Copy install command
  window.copyInstall = function (name) {
    var cmd = 'hone plugin install ' + name;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(cmd).then(function () {
        showToast('Copied: ' + cmd);
      });
    } else {
      // Fallback
      var ta = document.createElement('textarea');
      ta.value = cmd;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      showToast('Copied: ' + cmd);
    }
  };

  function showToast(msg) {
    var existing = document.querySelector('.copy-toast');
    if (existing) existing.remove();
    var toast = document.createElement('div');
    toast.className = 'copy-toast';
    toast.textContent = msg;
    document.body.appendChild(toast);
    requestAnimationFrame(function () {
      toast.classList.add('show');
    });
    setTimeout(function () {
      toast.classList.remove('show');
      setTimeout(function () { toast.remove(); }, 300);
    }, 2000);
  }

  // Search autocomplete (debounced)
  var searchInput = document.querySelector('.hero-search input, .search-form input');
  if (searchInput) {
    var dropdown = null;
    var debounceTimer = null;

    searchInput.addEventListener('input', function () {
      var q = searchInput.value.trim();
      if (debounceTimer) clearTimeout(debounceTimer);
      if (q.length < 2) {
        hideDropdown();
        return;
      }
      debounceTimer = setTimeout(function () {
        fetch('/api/v1/plugins?query=' + encodeURIComponent(q) + '&pageSize=5')
          .then(function (r) { return r.json(); })
          .then(function (data) {
            if (!data.results || data.results.length === 0) {
              hideDropdown();
              return;
            }
            showDropdown(data.results);
          })
          .catch(function () { hideDropdown(); });
      }, 250);
    });

    searchInput.addEventListener('blur', function () {
      setTimeout(hideDropdown, 200);
    });

    function showDropdown(results) {
      hideDropdown();
      dropdown = document.createElement('div');
      dropdown.className = 'search-dropdown';
      dropdown.style.cssText = 'position:absolute;background:var(--bg-card);border:1px solid var(--border);border-radius:0 0 8px 8px;width:100%;z-index:200;box-shadow:var(--shadow);max-height:300px;overflow-y:auto;';
      for (var i = 0; i < results.length; i++) {
        var item = document.createElement('a');
        item.href = '/plugins/' + results[i].name;
        item.style.cssText = 'display:block;padding:10px 16px;color:var(--text);border-bottom:1px solid var(--border-light);font-size:0.9rem;';
        item.innerHTML = '<strong>' + escapeHtml(results[i].displayName) + '</strong><br><span style="font-size:0.8rem;color:var(--text-muted)">' + escapeHtml(results[i].description || '') + '</span>';
        dropdown.appendChild(item);
      }
      var parent = searchInput.parentElement;
      parent.style.position = 'relative';
      parent.appendChild(dropdown);
    }

    function hideDropdown() {
      if (dropdown) {
        dropdown.remove();
        dropdown = null;
      }
    }
  }

  // Install command click-to-copy
  var installCmds = document.querySelectorAll('.install-cmd');
  for (var i = 0; i < installCmds.length; i++) {
    installCmds[i].addEventListener('click', function () {
      var code = this.querySelector('code');
      if (code && navigator.clipboard) {
        navigator.clipboard.writeText(code.textContent).then(function () {
          showToast('Copied to clipboard');
        });
      }
    });
    installCmds[i].style.cursor = 'pointer';
    installCmds[i].title = 'Click to copy';
  }

  function escapeHtml(s) {
    if (!s) return '';
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
})();
