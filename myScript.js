// DOM이 모두 로드된 후 실행되도록 감싸줍니다.
document.addEventListener('DOMContentLoaded', () => {

    // ==========================================
    // 🎵 공통 사운드 객체 설정
    // ==========================================

    const boingSound = new Audio('sound/boing.mp3'); // 띠용~ (그냥 놨을 때, 메타몽 뾰잉)
    const snapSound = new Audio('sound/pop.mp3');   // 뽁! (뽑혔을 때)
    const metaPopSound = new Audio('sound/metapop.mp3');   // 뽁! (변신 시)

    snapSound.volume = 0.8; // 볼륨 조절

    // ==========================================
    // 0. 인트로 & 박대 터치(모바일/아이패드) 대응
    // ==========================================
    const titleGroup = document.querySelector('#introContainer .title-group');
    if (titleGroup) {
        titleGroup.addEventListener('click', () => {
            if (window.matchMedia('(hover: none), (pointer: coarse)').matches || window.innerWidth <= 768) {
                titleGroup.classList.toggle('is-wobbling');
            }
        });
    }

    const solePanel = document.querySelector('#tongueSole .image-panel');
    if (solePanel) {
        let isDraggingSole = false;
        let soleStartX = 0;
        let didSwipeFlip = false;
        let lastSoleFlipAt = 0;

        function isSoleInteractiveMode() {
            return window.matchMedia('(hover: none), (pointer: coarse)').matches || window.innerWidth <= 768;
        }

        function getSoleClientX(e) {
            if (e.touches && e.touches.length > 0) return e.touches[0].clientX;
            if (typeof e.clientX === 'number') return e.clientX;
            return null;
        }

        function startSoleDrag(e) {
            if (!isSoleInteractiveMode()) return;
            const x = getSoleClientX(e);
            if (x === null) return;
            isDraggingSole = true;
            soleStartX = x;
            didSwipeFlip = false;
        }

        function moveSoleDrag(e) {
            if (!isDraggingSole || didSwipeFlip) return;
            const x = getSoleClientX(e);
            if (x === null) return;
            if (Math.abs(x - soleStartX) >= 24) {
                solePanel.classList.toggle('flipped');
                didSwipeFlip = true;
                lastSoleFlipAt = Date.now();
            }
        }

        function endSoleDrag() {
            isDraggingSole = false;
        }

        solePanel.addEventListener('dragstart', (e) => e.preventDefault());
        solePanel.addEventListener('mousedown', startSoleDrag);
        window.addEventListener('mousemove', moveSoleDrag);
        window.addEventListener('mouseup', endSoleDrag);

        solePanel.addEventListener('touchstart', startSoleDrag, { passive: true });
        solePanel.addEventListener('touchmove', moveSoleDrag, { passive: true });
        window.addEventListener('touchend', endSoleDrag);

        solePanel.addEventListener('click', () => {
            if (!isSoleInteractiveMode()) return;
            if (Date.now() - lastSoleFlipAt < 350) return;
            solePanel.classList.toggle('flipped');
        });
    }

    // ==========================================
    // 1. 오야지치 인터랙션 (머리카락 당기기)
    // ==========================================
    const canvas = document.getElementById('hairCanvas');
    const oyajiContainer = document.getElementById('oyajiContainer');

    if (canvas && oyajiContainer) {
        const ctx = canvas.getContext('2d');
        const oyajiNormalImg = oyajiContainer.querySelector('.oyaji-normal');

        let width = 1420;
        let height = 1080;
        let scale = 1;
        let headX = width / 2;
        let headY = height - 600;
        let defaultTipY = headY - 120;
        let breakDistance = 400;

        let tip = { x: headX, y: defaultTipY };
        let velocity = { x: 0, y: 0 };
        const spring = 0.15; // 탄성
        const friction = 0.8; // 마찰

        let isDragging = false;
        let isBroken = false;
        let justBrokeAt = 0;
        let hairRafId = null;

        function updateOyajiMetrics() {
            const rect = oyajiContainer.getBoundingClientRect();
            const imgRect = oyajiNormalImg ? oyajiNormalImg.getBoundingClientRect() : rect;

            width = Math.max(1, Math.round(rect.width) || 1420);
            height = Math.max(1, Math.round(rect.height) || 1080);
            canvas.width = width;
            canvas.height = height;

            const renderedImgWidth = imgRect.width || width;
            const renderedImgHeight = imgRect.height || (renderedImgWidth * (980 / 1420));
            scale = renderedImgWidth / 1420;

            headX = width / 2;
            headY = height - (renderedImgHeight * (600 / 980));
            defaultTipY = headY - (120 * scale);
            breakDistance = Math.max(160, 400 * scale);

            if (!isDragging && !isBroken) {
                tip.x = headX;
                tip.y = defaultTipY;
            }
        }

        function drawHair() {
            ctx.clearRect(0, 0, width, height);

            if (isBroken) {
                hairRafId = null;
                return; // 뽑힌 후엔 그리지 않음
            }

            // 스프링 물리 효과 (드래그 중이 아닐 때 제자리로 튕기며 돌아가기)
            if (!isDragging) {
                let dx = headX - tip.x;
                let dy = defaultTipY - tip.y;
                velocity.x += dx * spring;
                velocity.y += dy * spring;
                velocity.x *= friction;
                velocity.y *= friction;
                tip.x += velocity.x;
                tip.y += velocity.y;
            }

            // 당긴 거리에 따라 꼬불거림이 펴지도록 계산 (S자 굴곡)
            let pullDx = tip.x - headX;
            let pullDy = tip.y - headY;
            let distance = Math.sqrt(pullDx * pullDx + pullDy * pullDy);

            // 팽팽해지는 정도
            let tension = Math.max(0, 1 - (distance / breakDistance));
            let curlOffset = 30 * scale * tension;

            ctx.beginPath();
            ctx.moveTo(headX, headY); // 정수리(시작점)

            // S자 굴곡을 위한 2개의 제어점 계산
            let cp1x = headX + (pullDx * 0.33) + curlOffset;
            let cp1y = headY + (pullDy * 0.33);

            let cp2x = headX + (pullDx * 0.66) - curlOffset;
            let cp2y = headY + (pullDy * 0.66);

            // 3차 베지어 곡선으로 S자 그리기
            ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, tip.x, tip.y);

            ctx.lineWidth = Math.max(3.5, 6 * scale);
            ctx.strokeStyle = '#000000'; // 머리카락 색상
            ctx.lineCap = 'round';
            ctx.stroke();

            hairRafId = requestAnimationFrame(drawHair);
        }

        function ensureHairLoop() {
            if (hairRafId === null && !isBroken) {
                hairRafId = requestAnimationFrame(drawHair);
            }
        }

        // 마우스/터치 이벤트 리스너
        function startDrag(e) {
            if (isBroken) return;
            if (e.touches && e.cancelable) e.preventDefault();
            isDragging = true;

            oyajiContainer.classList.add('is-dragging'); // 🔥 머리카락 당길 때 말풍선 숨김

            updateMousePos(e);
        }

        function onDrag(e) {
            if (!isDragging || isBroken) return;
            updateMousePos(e);

            let dx = tip.x - headX;
            let dy = tip.y - headY;
            let distance = Math.sqrt(dx * dx + dy * dy);

            // 임계값 이상 당기면 끊어짐
            if (distance > breakDistance) {
                isBroken = true;
                isDragging = false;
                justBrokeAt = Date.now();

                // 뽑힐 때 소리 재생
                snapSound.currentTime = 0;
                snapSound.play().catch(() => {});

                oyajiContainer.classList.add('active'); // 텍스트 및 화난 얼굴 표시
                oyajiContainer.classList.remove('is-dragging'); // 말풍선 숨김 상태 해제(active로 어차피 가려짐)
                ctx.clearRect(0, 0, width, height);
            }
        }

        function endDrag() {
            // 뽑히지 않은 상태에서 마우스를 놓았을 때 튕겨가는 소리
            if (isDragging && !isBroken) {
                boingSound.currentTime = 0;
                boingSound.play().catch(() => {});
            }
            isDragging = false;

            oyajiContainer.classList.remove('is-dragging'); // 🔥 마우스 놓으면 다시 말풍선 표시
        }

        function updateMousePos(e) {
            const rect = canvas.getBoundingClientRect();
            const touch = e.touches && e.touches.length > 0 ? e.touches[0] : null;
            const clientX = touch ? touch.clientX : e.clientX;
            const clientY = touch ? touch.clientY : e.clientY;

            if (typeof clientX !== 'number' || typeof clientY !== 'number') return;

            tip.x = (clientX - rect.left) * (canvas.width / rect.width);
            tip.y = (clientY - rect.top) * (canvas.height / rect.height);
        }

        // 오야지치 이벤트 바인딩
        canvas.addEventListener('mousedown', startDrag);
        window.addEventListener('mousemove', onDrag);
        window.addEventListener('mouseup', endDrag);

        canvas.addEventListener('touchstart', startDrag, { passive: false });
        window.addEventListener('touchmove', (e) => {
            if (isDragging && e.cancelable) e.preventDefault(); // 스크롤 방지
            onDrag(e);
        }, { passive: false });
        window.addEventListener('touchend', endDrag);

      

        window.addEventListener('resize', updateOyajiMetrics);
        if (oyajiNormalImg && !oyajiNormalImg.complete) {
            oyajiNormalImg.addEventListener('load', updateOyajiMetrics, { once: true });
        }

        // 초기화 및 애니메이션 시작
        updateOyajiMetrics();
        ensureHairLoop();
    }

    // ==========================================
    // 2. 메타몽 인터랙션 (3단계 순환 및 뾰잉 효과)
    // ==========================================
    const metamongContainer = document.getElementById('metamongContainer');

    if (metamongContainer) {
        let metaState = 0; // 현재 상태 (0:기본, 1:변신1, 2:변신2)

        metamongContainer.addEventListener('click', () => {
            // 1. 기존 상태 클래스 제거
            metamongContainer.classList.remove(`state-${metaState}`);

            // 2. 다음 상태 계산 (0 -> 1 -> 2 -> 0 반복)
            metaState = (metaState + 1) % 3;

            // 3. 새로운 상태 클래스 추가
            metamongContainer.classList.add(`state-${metaState}`);

            // 4. 뾰잉 애니메이션 리셋 및 재실행 (클릭할 때마다 애니메이션 트리거)
            metamongContainer.classList.remove('boing-anim');
            void metamongContainer.offsetWidth; // 브라우저 리플로우 강제 유발
            metamongContainer.classList.add('boing-anim');

            // 5. 뾰잉 소리 재생
            metaPopSound.currentTime = 0;
            metaPopSound.play().catch(() => {});
        });
    }

});

const dewContainer = document.querySelector('.dew-container');

// 🎵 듀 가나디용 효과음 (새로운 소리를 원하면 dew.mp3 등을 준비해 주세요)
// 기존에 쓰던 boingSound를 그대로 써도 무방합니다.
const dewSound = new Audio('sound/dew.mp3');

if (dewContainer) {
    dewContainer.addEventListener('click', () => {
        // 소리 처음부터 재생 (연속 클릭 대응)
        dewSound.currentTime = 0;
        dewSound.play().catch(() => {});
    });
}

// ==========================================
// 3. 매카패카 인터랙션 (흙먼지 지우기 + 스펀지 커서 + 거품 이펙트 + 소리)
// ==========================================
const dirtCanvas = document.getElementById('dirtCanvas');
const mkpkContainer = document.querySelector('.mkpk-container');

if (dirtCanvas && mkpkContainer) {
    const dirtCtx = dirtCanvas.getContext('2d');

    dirtCanvas.width = 450;
    dirtCanvas.height = 450;

    // 🎵 1. 문지르는 소리 객체 생성 (반복 재생 설정)
    const scrubSound = new Audio('sound/scrub.mp3');
    scrubSound.loop = true;
    scrubSound.volume = 0.6;

    // 💡 흙먼지 이미지 불러오기
    const dirtImage = new Image();
    dirtImage.src = 'img/mkpkDirty.png';

    dirtImage.onload = () => {
        dirtCtx.drawImage(dirtImage, 0, 0, dirtCanvas.width, dirtCanvas.height);
        dirtCtx.globalCompositeOperation = 'destination-out';
    };

    let isScrubbing = false;
    let scrubCount = 0;
    const requiredScrubs = 90;
    let isRevealed = false;

    function getClientPoint(e) {
        if (e.touches && e.touches.length > 0) {
            return { x: e.touches[0].clientX, y: e.touches[0].clientY };
        }
        if (typeof e.clientX === 'number' && typeof e.clientY === 'number') {
            return { x: e.clientX, y: e.clientY };
        }
        return null;
    }

    function getScrubPos(e, point) {
        const rect = dirtCanvas.getBoundingClientRect();
        const scaleX = dirtCanvas.width / rect.width;
        const scaleY = dirtCanvas.height / rect.height;

        return {
            x: (point.x - rect.left) * scaleX,
            y: (point.y - rect.top) * scaleY,
            rawX: point.x - rect.left,
            rawY: point.y - rect.top
        };
    }

    function startScrubbing(e) {
        if (isRevealed) return;
        if (e.touches && e.cancelable) e.preventDefault();
        isScrubbing = true;
        mkpkContainer.classList.add('is-dragging');

        // 🎵 2. 마우스를 누르면 소리 재생 시작
        scrubSound.play().catch(() => console.log("자동 재생 제한 대기중"));

        scrub(e);
    }

    function stopScrubbing() {
        if (!isScrubbing) return;
        isScrubbing = false;
        mkpkContainer.classList.remove('is-dragging');

        // 🎵 3. 마우스를 떼면 소리 일시정지
        scrubSound.pause();
    }

    function scrub(e) {
        if (!isScrubbing || isRevealed) return;

        const point = getClientPoint(e);
        if (!point) return;

        const pos = getScrubPos(e, point);

        dirtCtx.beginPath();
        dirtCtx.arc(pos.x, pos.y, 45, 0, Math.PI * 2);
        dirtCtx.fill();

        if (Math.random() < 0.6) {
            createFoam(pos.rawX, pos.rawY);
        }

        scrubCount++;

        if (scrubCount > requiredScrubs && !isRevealed) {
            isRevealed = true;

            // 🎵 4. 다 닦아내면 소리 강제 종료
            scrubSound.pause();

            dirtCtx.clearRect(0, 0, dirtCanvas.width, dirtCanvas.height);

            setTimeout(() => {
                mkpkContainer.classList.add('revealed');
            }, 700);
        }
    }

    function createFoam(x, y) {
        const foam = document.createElement('div');
        foam.classList.add('foam-bubble');

        const foamImages = [
            'img/foam1.png',
            'img/foam2.png',
            'img/foam3.png'
        ];

        const randomImage = foamImages[Math.floor(Math.random() * foamImages.length)];
        foam.style.backgroundImage = `url('${randomImage}')`;

        const size = Math.random() * 30 + 40;
        foam.style.width = `${size}px`;
        foam.style.height = `${size}px`;

        const offsetX = (Math.random() - 0.5) * 50;
        const offsetY = (Math.random() - 0.5) * 50;

        foam.style.left = `${x + offsetX - size / 2}px`;
        foam.style.top = `${y + offsetY - size / 2}px`;

        const stoneGroup = document.querySelector('.stone-group');
        if (stoneGroup) {
            stoneGroup.appendChild(foam);

            setTimeout(() => {
                foam.remove();
            }, 1000);
        }
    }

    // 마우스 이벤트 연결 (PC)
    dirtCanvas.addEventListener('mousedown', startScrubbing);
    window.addEventListener('mousemove', scrub);
    window.addEventListener('mouseup', stopScrubbing);
    dirtCanvas.addEventListener('mouseleave', stopScrubbing);

    // 터치 이벤트 연결 (모바일/태블릿)
    dirtCanvas.addEventListener('touchstart', (e) => {
        startScrubbing(e);
    }, { passive: false });
    window.addEventListener('touchmove', (e) => {
        if (isScrubbing && e.cancelable) e.preventDefault();
        scrub(e);
    }, { passive: false });
    window.addEventListener('touchend', stopScrubbing);
}


// ==========================================
// 4. 미스터 블로비 인터랙션 (마우스/터치를 따라가는 눈동자)
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    const mrbContainer = document.getElementById('mrbContainer');
    const leftEye = document.querySelector('.mrb-eye-left');
    const rightEye = document.querySelector('.mrb-eye-right');
    const leftPupil = document.querySelector('.mrb-pupil-left');
    const rightPupil = document.querySelector('.mrb-pupil-right');

    if (!mrbContainer || !leftEye || !rightEye || !leftPupil || !rightPupil) return;

    const eyes = [
        { socket: leftEye, pupil: leftPupil, baseWidth: 248, baseMaxX: 45, baseMaxY: 22, currentX: 0, currentY: 0, targetX: 0, targetY: 0 },
        { socket: rightEye, pupil: rightPupil, baseWidth: 246, baseMaxX: 45, baseMaxY: 22, currentX: 0, currentY: 0, targetX: 0, targetY: 0 }
    ];

    const baseSensitivityRadius = 150;
    const ease = 0.22;
    let pointerX = null;
    let pointerY = null;
    let rafId = null;

    function updateEyeTargets() {
        for (const eye of eyes) {
            if (pointerX === null || pointerY === null) {
                eye.targetX = 0;
                eye.targetY = 0;
                continue;
            }

            const rect = eye.socket.getBoundingClientRect();
            const scale = (rect.width || eye.baseWidth) / eye.baseWidth;
            const maxX = eye.baseMaxX * scale;
            const maxY = eye.baseMaxY * scale;
            const sensitivityRadius = baseSensitivityRadius * scale;

            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;
            const dx = pointerX - centerX;
            const dy = pointerY - centerY;
            const dist = Math.hypot(dx, dy);

            if (dist > 0.001) {
                const ratio = Math.min(dist / sensitivityRadius, 1);
                eye.targetX = (dx / dist) * maxX * ratio;
                eye.targetY = (dy / dist) * maxY * ratio;
            } else {
                eye.targetX = 0;
                eye.targetY = 0;
            }
        }
    }

    function animateEyes() {
        let needsNextFrame = false;

        for (const eye of eyes) {
            const diffX = eye.targetX - eye.currentX;
            const diffY = eye.targetY - eye.currentY;

            if (Math.abs(diffX) > 0.05 || Math.abs(diffY) > 0.05) {
                eye.currentX += diffX * ease;
                eye.currentY += diffY * ease;
                needsNextFrame = true;
            } else {
                eye.currentX = eye.targetX;
                eye.currentY = eye.targetY;
            }

            eye.pupil.style.transform = `translate3d(${eye.currentX.toFixed(2)}px, ${eye.currentY.toFixed(2)}px, 0) translate(-50%, -50%)`;
        }

        if (needsNextFrame) {
            rafId = requestAnimationFrame(animateEyes);
        } else {
            rafId = null;
        }
    }

    function startEyeAnimation() {
        if (rafId === null) {
            rafId = requestAnimationFrame(animateEyes);
        }
    }

    function handlePointerMove(clientX, clientY) {
        pointerX = clientX;
        pointerY = clientY;
        updateEyeTargets();
        startEyeAnimation();
    }

    window.addEventListener('mousemove', (e) => {
        handlePointerMove(e.clientX, e.clientY);
    });

    window.addEventListener('touchstart', (e) => {
        if (e.touches.length > 0) {
            handlePointerMove(e.touches[0].clientX, e.touches[0].clientY);
        }
    }, { passive: true });

    window.addEventListener('touchmove', (e) => {
        if (e.touches.length > 0) {
            handlePointerMove(e.touches[0].clientX, e.touches[0].clientY);
        }
    }, { passive: true });

    document.addEventListener('mouseleave', () => {
        pointerX = null;
        pointerY = null;
        updateEyeTargets();
        startEyeAnimation();
    });

    window.addEventListener('scroll', () => {
        if (pointerX !== null && pointerY !== null) {
            updateEyeTargets();
            startEyeAnimation();
        }
    }, { passive: true });

    window.addEventListener('resize', () => {
        if (pointerX !== null && pointerY !== null) {
            updateEyeTargets();
            startEyeAnimation();
        }
    });
});


// ==========================================
// 5. 퍼글러 인터랙션 (흔들리는 이빨 클릭 시 빠져서 사라짐)
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    const fugContainer = document.getElementById('fugContainer');
    const fugTooth = document.getElementById('fugTooth');

    if (!fugContainer || !fugTooth) return;

    const fugPopSound = new Audio('sound/pop.mp3');
    fugPopSound.volume = 0.8;

    let isPulled = false;

    fugTooth.addEventListener('click', () => {
        if (isPulled) return;
        isPulled = true;

        fugPopSound.currentTime = 0;
        fugPopSound.play().catch(() => {});

        fugContainer.classList.add('pulled');
        fugTooth.classList.add('pulled');

        fugTooth.addEventListener('animationend', () => {
            fugTooth.style.display = 'none';
        }, { once: true });
    });
});


// ==========================================
// 6. 먀쿠먀쿠 인터랙션 (마우스/터치를 따라 돌아가는 5개의 눈동자)
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    const mkContainer = document.getElementById('mkContainer');
    if (!mkContainer) return;

    const eyeConfigs = [
        { selector: '.mk-eye-1', baseWidth: 184, maxX: 58, maxY: 58 },
        { selector: '.mk-eye-2', baseWidth: 142, maxX: 33, maxY: 29.5 },
        { selector: '.mk-eye-3', baseWidth: 152, maxX: 44.5, maxY: 44.5 },
        { selector: '.mk-eye-4', baseWidth: 224, maxX: 41, maxY: 41 },
        { selector: '.mk-eye-5', baseWidth: 183, maxX: 52, maxY: 48.5 }
    ];

    const eyes = eyeConfigs
        .map(({ selector, baseWidth, maxX, maxY }) => {
            const socket = mkContainer.querySelector(selector);
            const pupil = socket ? socket.querySelector('.mk-pupil') : null;
            if (!socket || !pupil) return null;

            const baseRestX = Number(socket.dataset.restX) || 0;
            const baseRestY = Number(socket.dataset.restY) || 0;
            const rect = socket.getBoundingClientRect();
            const scale = (rect.width || baseWidth) / baseWidth;

            return {
                socket,
                pupil,
                baseWidth,
                baseMaxX: maxX,
                baseMaxY: maxY,
                baseRestX,
                baseRestY,
                currentX: baseRestX * scale,
                currentY: baseRestY * scale,
                targetX: baseRestX * scale,
                targetY: baseRestY * scale
            };
        })
        .filter(Boolean);

    if (eyes.length === 0) return;

    const baseSensitivityRadius = 150;
    const ease = 0.2;
    let pointerX = null;
    let pointerY = null;
    let rafId = null;

    function applyEyePositions() {
        for (const eye of eyes) {
            eye.pupil.style.transform = `translate3d(${eye.currentX.toFixed(2)}px, ${eye.currentY.toFixed(2)}px, 0) translate(-50%, -50%)`;
        }
    }

    function updateEyeTargets() {
        for (const eye of eyes) {
            const rect = eye.socket.getBoundingClientRect();
            const scale = (rect.width || eye.baseWidth) / eye.baseWidth;

            if (pointerX === null || pointerY === null) {
                eye.targetX = eye.baseRestX * scale;
                eye.targetY = eye.baseRestY * scale;
                continue;
            }

            const maxX = eye.baseMaxX * scale;
            const maxY = eye.baseMaxY * scale;
            const sensitivityRadius = baseSensitivityRadius * scale;

            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;
            const dx = pointerX - centerX;
            const dy = pointerY - centerY;
            const dist = Math.hypot(dx, dy);

            if (dist > 0.001) {
                const ratio = Math.min(dist / sensitivityRadius, 1);
                eye.targetX = (dx / dist) * maxX * ratio;
                eye.targetY = (dy / dist) * maxY * ratio;
            } else {
                eye.targetX = 0;
                eye.targetY = 0;
            }
        }
    }

    function animateEyes() {
        let needsNextFrame = false;

        for (const eye of eyes) {
            const diffX = eye.targetX - eye.currentX;
            const diffY = eye.targetY - eye.currentY;

            if (Math.abs(diffX) > 0.05 || Math.abs(diffY) > 0.05) {
                eye.currentX += diffX * ease;
                eye.currentY += diffY * ease;
                needsNextFrame = true;
            } else {
                eye.currentX = eye.targetX;
                eye.currentY = eye.targetY;
            }
        }

        applyEyePositions();

        if (needsNextFrame) {
            rafId = requestAnimationFrame(animateEyes);
        } else {
            rafId = null;
        }
    }

    function startEyeAnimation() {
        if (rafId === null) {
            rafId = requestAnimationFrame(animateEyes);
        }
    }

    function handlePointerMove(clientX, clientY) {
        pointerX = clientX;
        pointerY = clientY;
        updateEyeTargets();
        startEyeAnimation();
    }

    applyEyePositions();

    window.addEventListener('mousemove', (e) => {
        handlePointerMove(e.clientX, e.clientY);
    });

    window.addEventListener('touchstart', (e) => {
        if (e.touches.length > 0) {
            handlePointerMove(e.touches[0].clientX, e.touches[0].clientY);
        }
    }, { passive: true });

    window.addEventListener('touchmove', (e) => {
        if (e.touches.length > 0) {
            handlePointerMove(e.touches[0].clientX, e.touches[0].clientY);
        }
    }, { passive: true });

    document.addEventListener('mouseleave', () => {
        pointerX = null;
        pointerY = null;
        updateEyeTargets();
        startEyeAnimation();
    });

    window.addEventListener('scroll', () => {
        if (pointerX !== null && pointerY !== null) {
            updateEyeTargets();
            startEyeAnimation();
        }
    }, { passive: true });

    window.addEventListener('resize', () => {
        updateEyeTargets();
        startEyeAnimation();
    });

    window.addEventListener('load', () => {
        updateEyeTargets();
        if (pointerX === null) {
            for (const eye of eyes) {
                eye.currentX = eye.targetX;
                eye.currentY = eye.targetY;
            }
            applyEyePositions();
        }
    });
});
