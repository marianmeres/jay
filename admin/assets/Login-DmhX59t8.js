import{S as X,i as Y,s as Z,C,e as V,b as w,t as d,c as J,a as m,d as v,a4 as S,g as K,o as g,p as b,q as h,n as H,W as O,$ as P,z as L,v as F,w as z,M as x,E as ee,G as te,a0 as U,r as se,k as re,H as ne}from"./index-78E-VoOI.js";import{c as ae}from"./index-M8zbIJUp.js";import{p as le,j as ie,I as oe,K as A,q as fe,R as B,F as ue,f as W,H as ce,L as me,N as y,B as Q,O as pe,i as de}from"./App-B4vpKrUg.js";import{F as _e,S as $e}from"./SectionBox-x9iOIOlf.js";function ge(a){let t,s;return t=new _e({props:{$$slots:{default:[je]},$$scope:{ctx:a}}}),{c(){g(t.$$.fragment)},m(e,r){b(t,e,r),s=!0},p(e,r){const n={};r&2077&&(n.$$scope={dirty:r,ctx:e}),t.$set(n)},i(e){s||(m(t.$$.fragment,e),s=!0)},o(e){d(t.$$.fragment,e),s=!1},d(e){h(t,e)}}}function be(a){var e;let t,s;return t=new ue({props:{error:`Project "${(e=a[0])==null?void 0:e.projectId}" not found.`,touch:Date.now(),showBack:!1}}),{c(){g(t.$$.fragment)},m(r,n){b(t,r,n),s=!0},p(r,n){var l;const i={};n&1&&(i.error=`Project "${(l=r[0])==null?void 0:l.projectId}" not found.`),t.$set(i)},i(r){s||(m(t.$$.fragment,r),s=!0)},o(r){d(t.$$.fragment,r),s=!1},d(r){h(t,r)}}}function he(a){let t,s;return t=new W({props:{wrapClass:"p-4"}}),{c(){g(t.$$.fragment)},m(e,r){b(t,e,r),s=!0},p:H,i(e){s||(m(t.$$.fragment,e),s=!0)},o(e){d(t.$$.fragment,e),s=!1},d(e){h(t,e)}}}function G(a){let t,s;return t=new W({}),{c(){g(t.$$.fragment)},m(e,r){b(t,e,r),s=!0},i(e){s||(m(t.$$.fragment,e),s=!0)},o(e){d(t.$$.fragment,e),s=!1},d(e){h(t,e)}}}function we(a){let t,s,e=a[3].isFetching&&G();return{c(){e&&e.c(),t=re(`
						Submit`)},m(r,n){e&&e.m(r,n),w(r,t,n),s=!0},p(r,n){r[3].isFetching?e?n&8&&m(e,1):(e=G(),e.c(),m(e,1),e.m(t.parentNode,t)):e&&(K(),d(e,1,1,()=>{e=null}),J())},i(r){s||(m(e),s=!0)},o(r){d(e),s=!1},d(r){r&&v(t),e&&e.d(r)}}}function ve(a){let t,s,e,r,n,i,l,c,f,p,_,k,u,j;t=new me({props:{class:{box:"mt-4 bg-stuic-primary text-stuic-on-primary"},onDismiss:a[6].resetError,message:`${a[3].lastFetchError||""}`}});function R(o){a[7](o)}let E={type:"email",label:"Email",autocomplete:"email",placeholder:"user@example.com",disabled:a[3].isFetching,tabindex:1,required:!0,validate:!0,size:"sm"};a[4].email!==void 0&&(E.value=a[4].email),r=new y({props:E}),O.push(()=>P(r,"value",R));function I(o){a[8](o)}let M={type:"password",label:"Password",autocomplete:"current-password",disabled:a[3].isFetching,required:!0,tabindex:1,validate:!0,useTrim:!1,size:"sm"};return a[4].password!==void 0&&(M.value=a[4].password),l=new y({props:M}),O.push(()=>P(l,"value",I)),_=new Q({props:{variant:"primary",type:"submit",disabled:a[3].isFetching,tabindex:1,$$slots:{default:[we]},$$scope:{ctx:a}}}),{c(){g(t.$$.fragment),s=C(),e=L("form"),g(r.$$.fragment),i=C(),g(l.$$.fragment),f=C(),p=L("div"),g(_.$$.fragment),F(p,"class","mt-8 flex justify-between items-end"),F(e,"class","mt-5")},m(o,$){b(t,o,$),w(o,s,$),w(o,e,$),b(r,e,null),z(e,i),b(l,e,null),z(e,f),z(e,p),b(_,p,null),k=!0,u||(j=[x(pe.call(null,e,{autoFocusFirst:!1})),ee(e,"submit",te(a[9]))],u=!0)},p(o,$){const N={};$&8&&(N.message=`${o[3].lastFetchError||""}`),t.$set(N);const q={};$&8&&(q.disabled=o[3].isFetching),!n&&$&16&&(n=!0,q.value=o[4].email,U(()=>n=!1)),r.$set(q);const T={};$&8&&(T.disabled=o[3].isFetching),!c&&$&16&&(c=!0,T.value=o[4].password,U(()=>c=!1)),l.$set(T);const D={};$&8&&(D.disabled=o[3].isFetching),$&2056&&(D.$$scope={dirty:$,ctx:o}),_.$set(D)},i(o){k||(m(t.$$.fragment,o),m(r.$$.fragment,o),m(l.$$.fragment,o),m(_.$$.fragment,o),k=!0)},o(o){d(t.$$.fragment,o),d(r.$$.fragment,o),d(l.$$.fragment,o),d(_.$$.fragment,o),k=!1},d(o){o&&(v(s),v(e)),h(t,o),h(r),h(l),h(_),u=!1,se(j)}}}function ke(a){let t,s=de({size:16})+"",e;return{c(){t=new ne(!1),e=V(),t.a=e},m(r,n){t.m(s,r,n),w(r,e,n)},p:H,d(r){r&&(v(e),t.d())}}}function Fe(a){var r;let t,s,e;return s=new Q({props:{href:B.SERVER.url((r=a[0])==null?void 0:r.serverUrl),size:"sm",variant:"naked flat",class:"bg-white/50 hover:bg-white/75",$$slots:{default:[ke]},$$scope:{ctx:a}}}),{c(){t=L("div"),g(s.$$.fragment),F(t,"class","w-10 flex"),F(t,"slot","title_left")},m(n,i){w(n,t,i),b(s,t,null),e=!0},p(n,i){var c;const l={};i&1&&(l.href=B.SERVER.url((c=n[0])==null?void 0:c.serverUrl)),i&2048&&(l.$$scope={dirty:i,ctx:n}),s.$set(l)},i(n){e||(m(s.$$.fragment,n),e=!0)},o(n){d(s.$$.fragment,n),e=!1},d(n){n&&v(t),h(s)}}}function Ee(a){let t;return{c(){t=L("div"),t.textContent=" ",F(t,"class","w-10"),F(t,"slot","title_right")},m(s,e){w(s,t,e)},p:H,d(s){s&&v(t)}}}function je(a){var e,r;let t,s;return t=new $e({props:{class:ce,title:((e=a[2])==null?void 0:e.name)||((r=a[2])==null?void 0:r.id),titleLevel:1,titleRenderLevel:3,titleClass:"text-center mb-0 text-pink-600",$$slots:{title_right:[Ee],title_left:[Fe],default:[ve]},$$scope:{ctx:a}}}),{c(){g(t.$$.fragment)},m(n,i){b(t,n,i),s=!0},p(n,i){var c,f;const l={};i&4&&(l.title=((c=n[2])==null?void 0:c.name)||((f=n[2])==null?void 0:f.id)),i&2073&&(l.$$scope={dirty:i,ctx:n}),t.$set(l)},i(n){s||(m(t.$$.fragment,n),s=!0)},o(n){d(t.$$.fragment,n),s=!1},d(n){h(t,n)}}}function Re(a){let t,s,e,r,n;const i=[he,be,ge],l=[];function c(f,p){return f[1].isFetching?0:f[2]?2:1}return s=c(a),e=l[s]=i[s](a),{c(){t=C(),e.c(),r=V(),document.title="Login"},m(f,p){w(f,t,p),l[s].m(f,p),w(f,r,p),n=!0},p(f,[p]){let _=s;s=c(f),s===_?l[s].p(f,p):(K(),d(l[_],1,1,()=>{l[_]=null}),J(),e=l[s],e?e.p(f,p):(e=l[s]=i[s](f),e.c()),m(e,1),e.m(r.parentNode,r))},i(f){n||(m(e),n=!0)},o(f){d(e),n=!1},d(f){f&&(v(t),v(r)),l[s].d(f)}}}function Se(a,t,s){let e,r,n,i;S(a,le,u=>s(1,e=u)),S(a,ie,u=>s(2,r=u)),ae("Login");let{params:l}=t;const c=oe({email:"",password:"",rememberMe:!0});S(a,c,u=>s(4,i=u));const f=A.login.fetcher;S(a,f,u=>s(3,n=u));function p(u){a.$$.not_equal(i.email,u)&&(i.email=u,c.set(i))}function _(u){a.$$.not_equal(i.password,u)&&(i.password=u,c.set(i))}const k=async u=>{const j=i.rememberMe?"local":"session",{serverUrl:R,projectId:E}=l||{};if(await A.login(j,{...i,serverUrl:R,projectId:E}))return fe(B.PROJECT.url(R,E))};return a.$$set=u=>{"params"in u&&s(0,l=u.params)},[l,e,r,n,i,c,f,p,_,k]}class De extends X{constructor(t){super(),Y(this,t,Se,Re,Z,{params:0})}}export{De as default};
