window.__ModuleLoader__.load({ id: "dsh-chatgpt-subscription", factory: (require) => {
var module = { exports: {} }; var exports = module.exports;
// dsh-chatgpt-subscription — client half：设置侧边栏「订阅」页（紧邻「模型」、图标一致）
module.exports = {
  inject: ['slots'],
  async apply(ctx) {
    // slots 服务等待就绪（最多 18s）
    let slots = ctx.slots || ctx.get('slots');
    for (let i = 0; slots === undefined && i < 60; i++) {
      await new Promise(function (resolve) { window.setTimeout(resolve, 300); });
      slots = ctx.slots || ctx.get('slots');
    }
    if (slots === undefined) {
      console.warn('[dsh-chatgpt-subscription] slots 服务未就绪，设置页未注册');
      return;
    }

    // RPC 封装（webServer HTTP）
    const PREFIX = '/_dsh/dsh-chatgpt-subscription';
    function rpc(method, args) {
      const url = PREFIX + '/' + method;
      return fetch(url, {
        method: args ? 'POST' : 'GET',
        headers: { 'content-type': 'application/json' },
        body: args ? JSON.stringify(args) : undefined,
      }).then(function (r) { return r.json(); });
    }

    // React.createElement 快捷
    var React = window.React;
    function h(tag, props, children) { return React.createElement(tag, props, children); }

    // ---------- 设置页组件 ----------
    function SubscriptionPage(props) {
      var _React$useState = React.useState(null),
          status = _React$useState[0],
          setStatus = _React$useState[1];
      var _React$useState2 = React.useState(false),
          authorizing = _React$useState2[0],
          setAuthorizing = _React$useState2[1];

      // 加载状态 + 轮询
      var load = React.useCallback(function () {
        rpc('getCodexBridgeStatus').then(function (s) { setStatus(s); }).catch(function (e) { setStatus({ ok: false, error: { message: '获取状态失败' } }); });
      }, []);

      React.useEffect(function () {
        load();
        var timer = window.setInterval(load, 5000); // 每 5s 刷新一次（授权中时更快感知）
        return function () { window.clearInterval(timer); };
      }, [load]);

      // 授权按钮处理
      var handleAuthorize = React.useCallback(function () {
        if (authorizing) return;
        setAuthorizing(true);
        rpc('startCodexOAuth').then(function (res) {
          if (!res.ok) {
            alert('启动授权失败：' + (res.error && res.error.message || '未知错误'));
            setAuthorizing(false);
            return;
          }
          // 打开浏览器授权页（window.open 兜底；host 也会尝试 open shell）
          if (res.authorizeUrl) window.open(res.authorizeUrl, '_blank');
          // 轮询直到 bound=true 或超时
          var poll = window.setInterval(function () {
            rpc('getCodexBridgeStatus').then(function (s) {
              setStatus(s);
              if (s.bound || !s.oauthInFlight) {
                window.clearInterval(poll);
                setAuthorizing(false);
              }
            });
          }, 2000);
        }).catch(function (e) {
          alert('启动授权异常：' + e.message);
          setAuthorizing(false);
        });
      }, [authorizing]);

      // 解绑
      var handleUnbind = React.useCallback(function () {
        if (!confirm('确定要解绑 ChatGPT 订阅吗？')) return;
        rpc('unbindCodex').then(function (res) {
          if (res.ok) { load(); } else { alert('解绑失败：' + (res.error && res.error.message || '')); }
        });
      }, [load]);

      // 格式化时间戳
      function fmtTime(ms) {
        if (!ms) return '—';
        var d = new Date(ms);
        return String(d.getFullYear()) + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0') + ' ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
      }
      function fmtCountdown(ms) {
        if (!ms || ms <= 0) return '已到期';
        var totalSec = Math.floor(ms / 1000);
        var h = Math.floor(totalSec / 3600);
        var m = Math.floor((totalSec % 3600) / 60);
        var s = totalSec % 60;
        var p = function (x) { return String(x).padStart(2, '0'); };
        return h > 0 ? h + 'h' + p(m) + 'm' : p(m) + ':' + p(s);
      }

      var style = { maxWidth: 720, margin: '0 auto', padding: '1rem' };
      var cardStyle = { border: '1px solid var(--dsw-alias-border-l2)', borderRadius: 12, padding: '1rem 1.2rem', marginBottom: '1rem', background: 'var(--dsw-alias-bg-module-platform)' };
      var btnPrimary = { background: 'var(--dsw-alias-button-primary-fill)', color: 'var(--dsw-alias-label-primary-foreground)', border: 'none', borderRadius: 18, padding: '0 1.2rem', height: 36, cursor: 'pointer', fontSize: 14 };
      var btnDanger = { background: 'transparent', color: 'var(--dsw-alias-state-error-primary)', border: '1px solid var(--dsw-alias-state-error-primary)', borderRadius: 18, padding: '0 1rem', height: 32, cursor: 'pointer', fontSize: 13 };
      var btnSecondary = { background: 'transparent', color: 'var(--dsw-alias-label-primary)', border: '1px solid var(--dsw-alias-border-l2)', borderRadius: 18, padding: '0 1rem', height: 32, cursor: 'pointer', fontSize: 13 };

      if (!status) return h('div', { style: style }, h('p', null, '加载中…'));

      var bound = status.bound;
      var errorMsg = (status.error && status.error.message) || '';

      return h('div', { style: style },
        h('h2', { style: { marginTop: 0, fontSize: 18, fontWeight: 500 } }, 'ChatGPT 订阅'),
        h('div', { style: cardStyle },
          !bound ? h('div', null,
            h('p', { style: { color: 'var(--dsw-alias-label-tertiary)', fontSize: 14 } }, '绑定后可在 DSH 中使用 ChatGPT Plus/Pro 订阅额度对话，并在底部信息栏查看剩余额度与重置时间。'),
            h('button', { style: Object.assign({}, btnPrimary, { marginTop: '0.5rem' }), onClick: handleAuthorize, disabled: authorizing }, authorizing ? '授权中…' : '授权登录'),
            errorMsg ? h('p', { style: { color: 'var(--dsw-alias-state-error-primary)', fontSize: 13, marginTop: '0.5rem' } }, errorMsg) : null
          ) : h('div', null,
            h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: '0.8rem' } },
              h('span', { style: { width: 8, height: 8, borderRadius: '50%', background: 'var(--dsw-alias-state-success-primary)', display: 'inline-block' } }),
              h('strong', null, '已绑定')
            ),
            status.expiresAt ? h('p', { style: { fontSize: 13, color: 'var(--dsw-alias-label-secondary)' } }, '令牌有效期至：' + fmtTime(status.expiresAt) + '（剩余 ' + fmtCountdown(status.expiresAt - Date.now()) + '）') : null,
            h('div', { style: { display: 'flex', gap: 8, marginTop: '1rem' } },
              h('button', { style: btnSecondary, onClick: handleAuthorize, disabled: authorizing }, '重新授权'),
              h('button', { style: btnDanger, onClick: handleUnbind }, '解绑')
            )
          )
        ),
        h('p', { style: { fontSize: 12, color: 'var(--dsw-alias-label-tertiary)', marginTop: '1rem' } },
          '说明：绑定由官方 OAuth 流程完成，令牌存储在 ~/.codex/auth.json（0600）。独立插件 dsh-chatgpt-subscription 负责维护令牌，bottom-info-bar 只读令牌显示额度。'
        )
      );
    }

    // 注册 settings.section（order 控制排序：紧接「模型」之后）
    // 「模型」section 的 order 通常在 10-20 之间，我们设稍大一点确保在后
    var dispose = slots.register(
      { name: 'settings.section', id: 'chatgpt-subscription', order: 25 },
      function (slotProps) {
        return h(SubscriptionPage, slotProps);
      }
    );

    return function () { if (dispose) dispose(); };
  },
};

return module.exports;
} });
