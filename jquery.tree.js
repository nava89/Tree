(function ($) {

    $.fn.tree = function (json,args) {
        return new Tree(this, json, args);
    };
    var animationLock = false;
    var linesCount;
    TreeNode = function (tree, jsonTree, args) {
        this.markup = "";
        this.parent = jsonTree.parent;
        this._children = [];
        this.jsonObject = jsonTree;

        if(jsonTree.children != null && jsonTree.children.length > 0){
            for (var i = 0; i < jsonTree.children.length; i++) {
                var child = jsonTree.children[i];
                //Add this a parent
                child['parent'] = this;

                var treeNode = new TreeNode(tree,child,args);
                this._children.push(treeNode);
            };
        }

        this.column = parseInt(jsonTree.col);
        this.row = parseInt(jsonTree.row);
        this.status = 'summary';
        this.summaryTemplate = args.summaryTemplate;
        this.detailsTemplate = args.detailsTemplate;
        this.id = jsonTree.id;
        this._events = {};
        this.tree = tree;
        //Generating the content of the node
        this.markup = this._generateNode();
        this.internalContent = $(this.markup).children('div');
        //Setting the default click event
        $(this.markup).find('.node').on('click',this,this._defaultNodeClick);
    }
    
    TreeNode.prototype = {
        /*
        * Draw lines to it children
        */
        drawLines: function () {
            
            if (this._children.length == 0) {
                return;
            }
            var containerOffset = $(this.tree.markup).offset();
            var offset1 = $(this.internalContent).offset();
            // offset1.left -= containerOffset.left;
            // offset1.top -= containerOffset.top;

            var width1 = $(this.internalContent).width();
            var height1 = $(this.internalContent).height();
                
            for (var i = 0; i < this._children.length; i++) {
                
                var x1 = offset1.left + i * (width1 / this._children.length) + width1 / (2 * this._children.length);
                var y1 = offset1.top + height1 + 2;
                x1 -= containerOffset.left;
                y1 -= containerOffset.top;

                var child = this._children[i];
                var offset2 = $(child.internalContent).offset();
                // offset2.left -= containerOffset.left;
                // offset2.top -= containerOffset.top;

                var width2 = $(child.internalContent).width();
                var x2 = offset2.left + (width2 / 2);
                var y2 = offset2.top - 2;
                x2 -= containerOffset.left;
                y2 -= containerOffset.top;

                var winHeight = $(window).height();
                var winWidth = $(window).width();

                if( (x1 >= 0 && x1 <= winWidth && y1 >=0 && y1 <= winHeight + 50) 
                    || (x2 >= 0 && x2 <= winWidth && y2 >=0 && y2 <= winHeight + 50) ){

                    if (Math.min(x1,x2) < 0) {
                        //One of the point is negative in the horizontal axis
                        //We must reset this point to the intersection of the line with the y-axis
                        var res = this._lineIntersectionY(x1,x2,y1,y2);
                        x1 = res.x1; x2 = res.x2; y1 = res.y1; y2 = res.y2;
                    }
                    if (Math.min(y1,y2) < 0) {
                        //One of the point is negative in the vertical axis
                        //We must reset this point to the intersection of the line with the x-axis
                        var res = _lineIntersectionX(x1,x2,y1,y2);
                        x1 = res.x1; x2 = res.x2; y1 = res.y1; y2 = res.y2;
                    }
                    // if (Math.max(x1,x2) > winWidth) {
                    //     //One of the point is outside the boundaries of the visible region on the x-axis
                    //     var res = this._lineIntersectionY(x1 - winWidth,x2 - winWidth,y1,y2);
                    //     x1 = res.x1 + winWidth; x2 = res.x2 + winWidth; y1 = res.y1; y2 = res.y2;
                    // }
                    // if (Math.max(y1,y2) > winHeight) {
                    //     //One of the point is outside the boundaries of the visible region on the y-axis
                    //     var res = this._lineIntersectionX(x1,x2,y1-winHeight,y2-winHeight);
                    //     x1 = res.x1; x2 = res.x2; y1 = res.y1 + winHeight; y2 = res.y2 + winHeight;
                    // }

                    linesCount+=1;
                    this._drawLine(x1, y1, x2, y2);
                }

                //Here check if the node is visible. If it is out of the screen then not paint it
                child.drawLines();
            }

        },
        _lineIntersectionY : function(x1,x2,y1,y2){
            var m = (y2 - y1)/(x2 - x1);
            var n = y1 - m * x1;
            if (x1 < x2){
                x1 = 0;
                y1 = n;
            }
            else{
                x2 = 0;
                y2 = n;
            }
            return {x1:x1,x2:x2,y1:y1,y2:y2};

        },
        _lineIntersectionX : function(x1,x2,y1,y2){
            var m = (y2 - y1)/(x2 - x1);
            var n = y1 - m * x1;
            var x0 = -n / m;

            if (y1 < y2){
                y1 = 0;
                x1 = x0;
            }
            else{
                y2 = 0;
                x2 = x0;
            }
            return {x1:x1,x2:x2,y1:y1,y2:y2};

        },
        children: function () {
            return this._children;
        },
        numberOfChildren: function () {
            return this._children.length;
        },
        isLeaf: function () {
            return this._children.length == 0;
        },
        isRoot: function () {
            return this.parent == null;
        },
        /*
        Fill template with the values from the json.
        Return a jQuery object containing the content of the node.
        */
        _generateNode: function () {
            var node = $('<center class="node"></center>');

            var div = document.createElement("div");
            div.setAttribute("id", this.id);
            div.setAttribute("class", "node");
            div.setAttribute("state", "summary");

            for(key in this.jsonObject){
                this.summaryTemplate = this.summaryTemplate.replace('{{' + key +'}}',this.jsonObject[key]);
                this.detailsTemplate = this.detailsTemplate.replace('{{' + key +'}}',this.jsonObject[key]);
            }

            //Wrap the templates into divs with especific classes needed for animation
            var summary = document.createElement("div");
            summary.setAttribute("id", this.id);
            summary.setAttribute("class", "summary");
            $(summary).append(this.summaryTemplate);
            
            var details = document.createElement("div");
            details.setAttribute("id", this.id);
            details.setAttribute("class", "details");
            $(details).append(this.detailsTemplate);
            $(details).attr("style", "display:none");
            
            $(div).append($(summary));
            $(div).append($(details));

            $(node).append(div);

            return node;

        },
        /*
        Returns the jquery object representing the internal content of the node. Including the center tag
        */
        node : function(){
            return this.markup;
        },
        getRow: function () {
            return this.row;
        },
        getColumn: function () {
            return this.column;
        },
        _drawLine: function (x1, y1, x2, y2) {

            //Check if the line is inside the visible area
               

            if (y1 < y2) {
                var pom = y1;
                y1 = y2;
                y2 = pom;
                pom = x1;
                x1 = x2;
                x2 = pom;
            }

            var a = Math.abs(x1 - x2);
            var b = Math.abs(y1 - y2);
            var c;
            var sx = (x1 + x2) / 2;
            var sy = (y1 + y2) / 2;
            var width = Math.sqrt(a * a + b * b);
            var x = sx - width / 2;
            var y = sy;

            a = width / 2;

            c = Math.abs(sx - x);

            b = Math.sqrt(Math.abs(x1 - x) * Math.abs(x1 - x) + Math.abs(y1 - y) * Math.abs(y1 - y));

            var cosb = (b * b - a * a - c * c) / (2 * a * c);
            var rad = Math.acos(cosb);
            var deg = (rad * 180) / Math.PI

            div = document.createElement("div");
            div.setAttribute('style', 'width:' + width + 'px;height:0px;-moz-transform:rotate(' + deg + 'deg);-webkit-transform:rotate(' + deg + 'deg);-ms-transform:rotate(' + deg + 'deg);top:' + y + 'px;left:' + x + 'px;');
            div.setAttribute("class", "nodeLine");

            $(this.tree.markup).append(div);
            //$('body').append(div);
            //document.getElementById("treeDiv").appendChild(div);
            
        },
        _defaultNodeClick: function(event){
            var treeNode = event.data;
            if (animationLock) {
                return;
            }
            //Adquiring the lock
            animationLock = true;     

            if (treeNode.status == "summary") {
                treeNode.displayStatus('details');
                
            } else if (treeNode.status == "details") {
                treeNode.displayStatus('collapsed');
            } else {
                treeNode.displayStatus('summary');
            }
            setTimeout(treeNode.tree.resetLines, treeNode.tree.animationTime, treeNode.tree);
            
        },
        getStatus : function (){
            return this.status;
        },
        setStatus : function(status){
            this.status = status;
        },
        /*
        Conducts the animation that changes from one status to another
        */
        displayStatus : function(status){
            $(".nodeLine").remove();
            switch (status){
                case 'collapsed':
                    $(this.markup).children('div').animate({
                        width: 18,
                        height: 18
                    }, this.animationTime);
                    $(this.markup).find(".details").fadeOut();
                    $(this.markup).find(".summary").fadeOut();
                    $(this.markup).attr("state", "collapsed");
                    this.status = 'collapsed';

                break;
                case 'summary':
                    anchoCont = $(this.markup).find(".summary").width();
                    altoCont = $(this.markup).find(".summary").height();
                    $(this.markup).children('div').animate({
                        //width: Math.abs(anchoCont) + 10,
                         width: Math.abs(anchoCont),
                        height: altoCont
                    }, this.animationTime);
                    $(this.markup).find(".summary").fadeIn();
                    $(this.markup).attr("state", "summary");
                    this.status = 'summary';
                    break;
                case 'details':
                    
                    anchoExtraCont = $(this.markup).find(".details").width();
                    altoExtraCont = $(this.markup).find(".details").height();

                    //total = Math.abs(altoCont) + Math.abs(altoExtraCont);

                    $(this.markup).children('div').animate({
                        //width: Math.abs(anchoCont > anchoExtraCont ? anchoCont : anchoExtraCont) + 10,
                        width: anchoExtraCont,
                        height: altoExtraCont
                    }, this.animationTime);
                    $(this.markup).find('.summary').fadeOut(1);
                    $(this.markup).find(".details").fadeIn();
                    $(this.markup).attr("state", "details");
                    this.status = 'details';
                break
            }
        },
        on : function (name, fn){
            this.log("adding listener to event " + name);
            this._events[name] = fn;
            return this;
        },
        trigger: function () {
            var name = arguments[0];
            var args = Array.prototype.slice.call(arguments);
            args.shift();
            args.unshift(this);

            this.log("firing event " + name);
            var handler = this._events[name];
            var ret = null;

            if (typeof (handler) == "function") {
                this.log("found event handler, calling " + name);
                try {
                    ret = handler.apply(this, args);
                }
                catch (e) {
                    this.log("event handler " + name + " had an exception");
                }
            }
            else {
                this.log("couldn't find an event handler for " + name);
            }
            return ret;
        },
        log: function () {
            if (!window.console) { return; }
            var args = [];
            args.push.apply(args, arguments);
            console.log.apply(console, args);
        },
        nodeAt : function(row,column){
            if (this.row == row && this.column == column) {
                return this;
            }
            if (this.row >= row || this.isLeaf())
                return null;

            var i = 0;
            var res = null;
            do{
                res = this._children[i].nodeAt(row,column);
                i+=1;

            }
            while(res == null && i < this._children.length);
            return res;
        }
    };

    Tree = function (markup, json, args) {
        this.markup = $(markup);
        this.jsonObject = JSON.parse(json);
        this.jsonObject['parent'] = null;
        this.root = new TreeNode(this,this.jsonObject,args); 
        this.animationTime = 500;
        this._events = {};
        // $(this.markup).scroll(
        //     function(){
        //         this.resizeWindow();
        //     }
            
        // );
    }

    Tree.prototype = {
        /*
        Draw the lines
        */
        resetLines: function(tree){
            linesCount = 0;
            tree.root.drawLines();
            $(".nodeLine").fadeIn(1000);
            //Releasing the lock
            animationLock = false;
            tree.log("Lines: " + linesCount);

        },        
        drawLines: function () {
            linesCount = 0;
            this.root.drawLines();
            this.log("Lines: " + linesCount);
        },
        hideLines: function () {
            
        },
        root: function () {
            return this.root;
        },
        _getMaxRowColumn: function(tree) {
            var row = tree.getRow();
            var column = tree.getColumn();

            if (tree._children.length == 0) {
                var res = {
                    row : tree.getRow() > row ? tree.getRow() : row,
                    column : tree.getColumn() > column ? tree.getColumn() : column

                };
                return res;
            } else {

                for (var i = 0; i < tree._children.length; i++) {
                    var n = this._getMaxRowColumn(tree._children[i]);
                    row = row > n.row ? row : n.row;
                    column = column > n.column ? column : n.column;
                }
            }
            return { row : row, column : column};
        },
        show : function () {
            var HTMLTable = document.createElement("table");
            HTMLTable.setAttribute("id", "treeTable");
            $(HTMLTable).appendTo(this.markup);
            var maxRowColumn = this._getMaxRowColumn(this.root);

            for (var i = 0; i <= maxRowColumn.row; i++) {
                //Create the row
                var tr = document.createElement("tr");
                tr.setAttribute("id", "tr" + i);
                
                var xspan = 0;
                for (var j = 0; j <= maxRowColumn.column + 1; j++) {
                    //Add columns to the current row
                    if (this._nodeAt(i,j) != null) {

                        //Add the empty column
                        if(xspan > 0){
                            var td = document.createElement("td");
                            td.setAttribute("colspan", xspan);
                            $(td).appendTo($(tr));
                        }

                        //Add the content column
                        td = document.createElement("td");
                        td.setAttribute('id','td' + i + '_' + j );
                        td.setAttribute("colspan", 2);
                        $(td).appendTo($(tr));
                        j+=1;

                        //Reset xspan
                        xspan = 0;
                    }
                    else 
                        xspan += 1;
                                        
                }
                //Add the empty column to fill the space
                if (xspan > 0) {
                    var td = document.createElement("td");
                    td.setAttribute("colspan", xspan);
                    //td.setAttribute("class","sobrante");
                    $(td).appendTo($(tr));
                }


                $(tr).appendTo($(HTMLTable));                
            };
            q = [];
            q.push(this.root);
            while(q.length > 0)
            {
                var treeNode = q.shift();
                for (var i = 0; i < treeNode._children.length; i++) {
                    q.push(treeNode._children[i])
                };
                var td = $(HTMLTable).find('#td' + treeNode.getRow() + '_' + treeNode.getColumn());
                $(td).append(treeNode.node());
            }
            
            this.drawLines();
        },
        setAnimationTime : function(time){
            this.animationTime = time;
        },
        _nodeAt : function(row, column){
            return this.root.nodeAt(row,column);
        },
        on : function (name, fn){
            this.log("adding listener to event " + name);
            this._events[name] = fn;
            return this;
        },
        trigger: function () {
            var name = arguments[0];
            var args = Array.prototype.slice.call(arguments);
            args.shift();
            args.unshift(this);

            this.log("firing event " + name);
            var handler = this._events[name];
            var ret = null;

            if (typeof (handler) == "function") {
                this.log("found event handler, calling " + name);
                try {
                    ret = handler.apply(this, args);
                }
                catch (e) {
                    this.log("event handler " + name + " had an exception");
                }
            }
            else {
                this.log("couldn't find an event handler for " + name);
            }
            return ret;
        },
        resizeWindow : function (){
            animationLock = true;
            this._removeLines();
            this.root.drawLines();
            $(".nodeLine").fadeIn(1000);

            //Releasing the lock
            animationLock = false;
        },
        _removeLines : function(){
            $(".nodeLine").remove();
        },
        log: function () {
            if (!window.console) { return; }
            var args = [];
            args.push.apply(args, arguments);
            console.log.apply(console, args);
        }
        
    };

})(window.jQuery);
