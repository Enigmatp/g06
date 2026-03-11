// Path module for S-shaped road geometry
// 提供 S 型主路的几何计算：CURVE_PTS、smoothPath、buildSmoothPath、posAtT

const GamePath = (() => {
    const CURVE_PTS = [
        { x: 0.78, y: 0.33 },
        { x: 0.82, y: 0.38 }, { x: 0.82, y: 0.42 },
        { x: 0.72, y: 0.47 }, { x: 0.50, y: 0.49 }, { x: 0.28, y: 0.47 }, { x: 0.18, y: 0.50 },
        { x: 0.15, y: 0.55 }, { x: 0.18, y: 0.60 },
        { x: 0.28, y: 0.63 }, { x: 0.50, y: 0.65 }, { x: 0.72, y: 0.63 }, { x: 0.82, y: 0.66 },
        { x: 0.85, y: 0.71 }, { x: 0.82, y: 0.76 },
        { x: 0.72, y: 0.80 }, { x: 0.50, y: 0.84 }, { x: 0.28, y: 0.80 }, { x: 0.15, y: 0.82 },
        { x: 0.06, y: 0.75 }, { x: 0.06, y: 0.60 }, { x: 0.06, y: 0.45 }, { x: 0.06, y: 0.38 },
        { x: 0.12, y: 0.33 }, { x: 0.22, y: 0.33 },
    ];

    let smoothPath = [];

    function buildSmoothPath() {
        let pts = CURVE_PTS.map(p => ({ x: p.x, y: p.y }));
        for (let iter = 0; iter < 3; iter++) {
            const next = [pts[0]];
            for (let i = 0; i < pts.length - 1; i++) {
                const a = pts[i], b = pts[i + 1];
                next.push({ x: a.x * 0.75 + b.x * 0.25, y: a.y * 0.75 + b.y * 0.25 });
                next.push({ x: a.x * 0.25 + b.x * 0.75, y: a.y * 0.25 + b.y * 0.75 });
            }
            next.push(pts[pts.length - 1]);
            pts = next;
        }
        smoothPath = pts;
        let total = 0; smoothPath[0].d = 0;
        for (let i = 1; i < smoothPath.length; i++) {
            total += Math.hypot(smoothPath[i].x - smoothPath[i - 1].x, smoothPath[i].y - smoothPath[i - 1].y);
            smoothPath[i].d = total;
        }
        smoothPath.totalLen = total;
    }

    function posAtT(t) {
        const targetD = t * smoothPath.totalLen;
        for (let i = 1; i < smoothPath.length; i++) {
            if (smoothPath[i].d >= targetD) {
                const a = smoothPath[i - 1], b = smoothPath[i], seg = b.d - a.d;
                const l = seg > 0 ? (targetD - a.d) / seg : 0;
                return { x: a.x + (b.x - a.x) * l, y: a.y + (b.y - a.y) * l };
            }
        }
        const last = smoothPath[smoothPath.length - 1];
        return { x: last.x, y: last.y };
    }

    // 初始化平滑路径
    buildSmoothPath();

    // 暴露给全局使用（main.js、buildings.js 等）
    return {
        CURVE_PTS,
        smoothPath,
        buildSmoothPath,
        posAtT,
    };
})();

