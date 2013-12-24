;(function () {
    'use strict';

    var $  = function (sel, con) { return (con || document).querySelector(sel); },
        $$ = function (sel, con) { return Array.prototype.slice.call((con || document).querySelectorAll(sel)); };

    var blockSel     = '.block[data-current="true"]',
        blockSideLen = 50,
        board        = $('#tetris-board'),
        boardCoors   = board.getBoundingClientRect();

    //  blockPointRows :: undefined -> [[[Number, Number]]]
    var blockPointRows = function () {
        var emptyRows = fg.arrayOf(null, boardCoors.height / blockSideLen).map(function () { return fg.arrayOf(null, boardCoors.width / blockSideLen); });

        return emptyRows.map(function (row, i) { return row.map(function (_, ii) { return [ii * blockSideLen, i * blockSideLen]; }); });
    };

    //  blockModel :: undefined -> [[{ p: [Number, Number], empty: Boolean }]]
    var blockModel = function () {
        return blockPointRows().map(function (r) { return r.map(function (p) { return { p: p, empty: overBoard(p) }; }); });
    };

    //  blockIndexs :: HTMLElement -> [Number, Number]
    var blockIndexs = function (el) {
        var coors = el.getBoundingClientRect();
        return [coors.top, coors.left].map(function (c) { return Math.floor(c / blockSideLen); });
    };

    //  canDrop :: HTMLElement -> Boolean
    var canDrop = function (el) {
        var coors  = el.getBoundingClientRect();

        return coors.top < boardCoors.top || overBoard([coors.left, coors.top + blockSideLen]);
    };

    //  clearRows :: Deferred -> Promise
    var clearRows = function (defer) {
        var row = rowToRemove();
        defer   = defer || Q.defer();

        if (row) {
            row.forEach(removeBlockAtPoint);
            dropAllBlocks().then(function () {
                incrementScore(1);
                clearRows(defer);
            });
        } else {
            defer.resolve();
        }

        return defer.promise;
    };

    //  doRound :: undefined -> undefined
    var doRound = function () {
        var currentBlock = $(blockSel);

        if (canDrop(currentBlock)) {
            dropTo(currentBlock, currentBlock.getBoundingClientRect().top + blockSideLen);
        } else {
            clearRows().then(function () {
                gameOver() ? endGame() : newRound();
            });
        }
    };

    //  dropAllBlocks :: Deferred -> Promise
    var dropAllBlocks = function (defer) {
        var dropped = false;
        defer       = defer || Q.defer();

        $$('.block').reverse().forEach(function (el) {
            if (canDrop(el)) {
                dropTo(el, el.getBoundingClientRect().top + blockSideLen);
                dropped = true;
            }
        });

        // If we dropped any blocks, call the function again as we might
        // need to drop more; otherwise, resolve the promise.
        dropped ? dropAllBlocks(defer) : defer.resolve();

        return defer.promise;
    };

    //  dropTo :: HTMLElement, Number -> undefined
    var dropTo = function (el, top) {
        el.style.top = top + 'px';
    };

    //  endGame :: undefined -> undefined
    var endGame = function () {
        alert('You loose.');
    };

    //  gameOver :: undefined -> Boolean
    var gameOver = function () {
        return !overBoard([middleX(), boardCoors.top]);
    };

    //  incrementScore :: Number -> undefined
    var incrementScore = function (incrementBy) {
        var score = Number($('#score').innerText);
        $('#score').innerText = (score + incrementBy);
    };

    //  lookupMoveModel :: String, HTMLElement, Boolean -> { p: [Number, Number], empty: Boolean }
    var lookupMoveModel = function (direction, el, animating) {
        var model     = blockModel(),
            indexs    = blockIndexs(el);

        // If we are currently moving down.
        if (animating !== false) indexs[0]++;
        switch (direction) {
            case 'down'  : indexs[0]++; break;
            case 'left'  : indexs[1]--; break;
            case 'right' : indexs[1]++; break;
        }

        return model[indexs[0]] && model[indexs[0]][indexs[1]] || { p: [-1, -1], empty: false };
    };

    //  makeBlock :: undefined -> HTMLElement
    var makeBlock = function () {
        var el = document.createElement('div');
        el.dataset.current   = 'true';
        el.dataset.animating = 'true';
        el.classList.add('block');
        el.style.top  = (-blockSideLen) + 'px';
        el.style.left = middleX() + 'px';
        return el;
    };

    //  middleX :: undefined -> Number
    var middleX = function () {
        var row = blockPointRows()[0];
        return row[Math.floor(row.length / 2)][0];
    };

    //  moveBlock :: String, Boolean, HTMLElement -> undefined
    var moveBlock = function (direction, animating, el) {
        var moveModel = lookupMoveModel(direction, el, animating);

        if (moveModel && moveModel.empty) {
            switch (direction) {
                case 'down'  :
                    fg.onePerTick([
                        function () { el.dataset.animating = 'false'; },
                        function () { dropTo(el, moveModel.p[1]); },
                        function () { el.dataset.animating = 'true'; },
                        doRound
                    ]);
                    break;
                case 'right' :
                case 'left'  : el.style.left = moveModel.p[0] + 'px'; break;
            }
        }
    };

    //  newRound :: undefined -> undefined
    var newRound = function () {
        var currentBlock = $(blockSel);
        if (currentBlock) {
            currentBlock.dataset.current   = 'false';
            currentBlock.dataset.animating = 'false';
        }

        board.appendChild(makeBlock());
        fg.nextTick(function () { dropTo($(blockSel), 0); });
    };

    //  overBoard :: [Number, Number] -> Boolean
    var overBoard = function (p) {
        return document.elementFromPoint(p[0], p[1]) === board;
    };

    //  removeBlockAtPoint :: [Number, Number] -> undefined
    var removeBlockAtPoint = function (p) {
        var block = document.elementFromPoint(p[0], p[1]);
        block.parentElement.removeChild(block);
    };

    //  rowToRemove :: undefined -> [[Number, Number]] || undefined
    var rowToRemove = function () {
        return blockPointRows().reverse().filter(function (row) { return row.every(fg.compose(overBoard, fg.not)); })[0];
    };

    board.addEventListener('transitionend', function (e) {
        if (e.propertyName !== 'top') return;

        doRound();
    });

    window.addEventListener('keyup', function (e) {
        ['Right', 'Left', 'Down'].indexOf(e.keyIdentifier) !== -1 ? moveBlock(e.keyIdentifier.toLowerCase(), true, $(blockSel))
                                                                  : void 0;
    });

    // Start game.
    dropTo($(blockSel), 0);
}());
