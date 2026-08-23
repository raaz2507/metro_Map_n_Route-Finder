/**
 * Bundled by jsDelivr using Rollup v4.62.2 and esbuild v0.28.1.
 * Original file: /npm/open-location-code@1.0.3/openlocationcode.js
 * 
 * https://cdn.jsdelivr.net/npm/open-location-code/+esm
 * 
 * Do NOT use SRI with dynamically generated files! More information: https://www.jsdelivr.com/using-sri-with-dynamic-files
 */
var w = {},
	D;
function F() {
	if (D) return w;
	D = 1;
	var s = function () {},
		l = "+",
		v = 8,
		d = "0",
		h = "23456789CFGHJMPQRVWX",
		L = h.length,
		A = 90,
		g = 180,
		O = 10,
		E = [20, 1, 0.05, 0.0025, 125e-6],
		C = 4,
		_ = 5,
		x = 125e-6,
		P = 6;
	((s.prototype.isValid = function (r) {
		if (
			!r ||
			r.indexOf(l) == -1 ||
			r.indexOf(l) != r.lastIndexOf(l) ||
			r.length == 1 ||
			r.indexOf(l) > v ||
			r.indexOf(l) % 2 == 1
		)
			return !1;
		if (r.indexOf(d) > -1) {
			if (r.indexOf(d) == 0) return !1;
			var e = r.match(new RegExp("(" + d + "+)", "g"));
			if (
				e.length > 1 ||
				e[0].length % 2 == 1 ||
				e[0].length > v - 2 ||
				r.charAt(r.length - 1) != l
			)
				return !1;
		}
		if (r.length - r.indexOf(l) - 1 == 1) return !1;
		r = r
			.replace(new RegExp("\\" + l + "+"), "")
			.replace(new RegExp(d + "+"), "");
		for (var t = 0, a = r.length; t < a; t++) {
			var n = r.charAt(t).toUpperCase();
			if (n != l && h.indexOf(n) == -1) return !1;
		}
		return !0;
	}),
		(s.prototype.isShort = function (r) {
			return this.isValid(r) ? r.indexOf(l) >= 0 && r.indexOf(l) < v : !1;
		}),
		(s.prototype.isFull = function (r) {
			if (!this.isValid(r) || this.isShort(r)) return !1;
			var e = h.indexOf(r.charAt(0).toUpperCase()) * L;
			if (e >= A * 2) return !1;
			if (r.length > 1) {
				var t = h.indexOf(r.charAt(1).toUpperCase()) * L;
				if (t >= g * 2) return !1;
			}
			return !0;
		}),
		(s.prototype.encode = function (r, e, t) {
			if ((typeof t > "u" && (t = O), t < 2 || (t < v && t % 2 == 1)))
				throw "IllegalArgumentException: Invalid Open Location Code length";
			((r = M(r)), (e = c(e)), r == 90 && (r = r - T(t)));
			var a = G(r, e, Math.min(t, O));
			return (t > O && (a += N(r, e, t - O)), a);
		}),
		(s.prototype.decode = function (r) {
			if (!this.isFull(r))
				throw (
					"IllegalArgumentException: Passed Open Location Code is not a valid full code: " +
					r
				);
			((r = r.replace(l, "")),
				(r = r.replace(new RegExp(d + "+"), "")),
				(r = r.toUpperCase()));
			var e = y(r.substring(0, O));
			if (r.length <= O) return e;
			var t = U(r.substring(O));
			return R(
				e.latitudeLo + t.latitudeLo,
				e.longitudeLo + t.longitudeLo,
				e.latitudeLo + t.latitudeHi,
				e.longitudeLo + t.longitudeHi,
				e.codeLength + t.codeLength,
			);
		}),
		(s.prototype.recoverNearest = function (r, e, t) {
			if (!this.isShort(r)) {
				if (this.isFull(r)) return r;
				throw "ValueError: Passed short code is not valid: " + r;
			}
			((e = M(e)), (t = c(t)), (r = r.toUpperCase()));
			var a = v - r.indexOf(l),
				n = Math.pow(20, 2 - a / 2),
				f = n / 2,
				o = Math.floor(e / n) * n,
				u = Math.floor(t / n) * n,
				i = this.decode(this.encode(o, u).substr(0, a) + r),
				p = i.latitudeCenter - e;
			return (
				p > f ? (i.latitudeCenter -= n) : p < -f && (i.latitudeCenter += n),
				(p = i.longitudeCenter - t),
				p > f ? (i.longitudeCenter -= n) : p < -f && (i.longitudeCenter += n),
				this.encode(i.latitudeCenter, i.longitudeCenter, i.codeLength)
			);
		}),
		(s.prototype.shorten = function (a, e, t) {
			if (!this.isFull(a))
				throw "ValueError: Passed code is not valid and full: " + a;
			if (a.indexOf(d) != -1)
				throw "ValueError: Cannot shorten padded codes: " + a;
			var a = a.toUpperCase(),
				n = this.decode(a);
			if (n.codeLength < P)
				throw "ValueError: Code length must be at least " + P;
			((e = M(e)), (t = c(t)));
			for (
				var f = Math.max(
						Math.abs(n.latitudeCenter - e),
						Math.abs(n.longitudeCenter - t),
					),
					o = E.length - 2;
				o >= 1;
				o--
			)
				if (f < E[o] * 0.3) return a.substring((o + 1) * 2);
			return a;
		}));
	var M = function (r) {
			return Math.min(90, Math.max(-90, r));
		},
		T = function (r) {
			return r <= 10
				? Math.pow(20, Math.floor(r / -2 + 2))
				: Math.pow(20, -3) / Math.pow(_, r - 10);
		},
		c = function (r) {
			for (; r < -180; ) r = r + 360;
			for (; r >= 180; ) r = r - 360;
			return r;
		},
		G = function (r, e, t) {
			for (var a = "", n = r + A, f = e + g, o = 0; o < t; ) {
				var u = E[Math.floor(o / 2)],
					i = Math.floor(n / u);
				((n -= i * u),
					(a += h.charAt(i)),
					(o += 1),
					(i = Math.floor(f / u)),
					(f -= i * u),
					(a += h.charAt(i)),
					(o += 1),
					o == v && o < t && (a += l));
			}
			return (
				a.length < v && (a = a + Array(v - a.length + 1).join(d)),
				a.length == v && (a = a + l),
				a
			);
		},
		N = function (r, e, t) {
			for (
				var a = "", n = x, f = x, o = (r + A) % n, u = (e + g) % f, i = 0;
				i < t;
				i++
			) {
				var p = Math.floor(o / (n / _)),
					S = Math.floor(u / (f / C));
				((n /= _),
					(f /= C),
					(o -= p * n),
					(u -= S * f),
					(a += h.charAt(p * C + S)));
			}
			return a;
		},
		y = function (r) {
			var e = I(r, 0),
				t = I(r, 1);
			return new R(e[0] - A, t[0] - g, e[1] - A, t[1] - g, r.length);
		},
		I = function (r, e) {
			for (var t = 0, a = 0; t * 2 + e < r.length; )
				((a += h.indexOf(r.charAt(t * 2 + e)) * E[t]), (t += 1));
			return [a, a + E[t - 1]];
		},
		U = function (r) {
			for (var e = 0, t = 0, a = x, n = x, f = 0; f < r.length; ) {
				var o = h.indexOf(r.charAt(f)),
					u = Math.floor(o / C),
					i = o % C;
				((a /= _), (n /= C), (e += u * a), (t += i * n), (f += 1));
			}
			return R(e, t, e + a, t + n, r.length);
		},
		R = (s.prototype.CodeArea = function (r, e, t, a, n) {
			return new b.init(r, e, t, a, n);
		}),
		b = {
			init: function (r, e, t, a, n) {
				((this.latitudeLo = r),
					(this.longitudeLo = e),
					(this.latitudeHi = t),
					(this.longitudeHi = a),
					(this.codeLength = n),
					(this.latitudeCenter = Math.min(r + (t - r) / 2, A)),
					(this.longitudeCenter = Math.min(e + (a - e) / 2, g)));
			},
		};
	return ((w.OpenLocationCode = s), w);
}
var m = F(),
	H = m.OpenLocationCode;
export { H as OpenLocationCode, m as default };
