/*
 * X3DOM JavaScript Library
 * http://x3dom.org
 *
 * (C)2009 Fraunhofer Insitute for Computer
 *         Graphics Reseach, Darmstadt
 * Dual licensed under the MIT and GPL.
 *
 * Based on code originally provided by
 * Philip Taylor: http://philip.html5.org
 */

/* ### GeoCoordinate ### */
x3dom.registerNodeType(
    "GeoCoordinate",
    "Geospatial",
    defineClass(x3dom.nodeTypes.X3DCoordinateNode,
        function (ctx) {
            x3dom.nodeTypes.GeoCoordinate.superClass.call(this, ctx);

            this.addField_MFVec3f(ctx, 'point', []);
            this.addField_MFString(ctx, 'geoSystem', ['GD', 'WE']);
            this.addField_SFNode('geoOrigin', x3dom.nodeTypes.GeoOrigin);
        },
        {
            elipsoideParameters:
            {
                'AA' : [ 'Airy 1830', '6377563.396', '299.3249646' ],
                'AM' : [ 'Modified Airy', '6377340.189', '299.3249646' ],
                'AN' : [ 'Australian National', '6378160', '298.25' ],
                'BN' : [ 'Bessel 1841 (Namibia)', '6377483.865', '299.1528128' ],
                'BR' : [ 'Bessel 1841 (Ethiopia Indonesia...)', '6377397.155', '299.1528128' ],
                'CC' : [ 'Clarke 1866', '6378206.4', '294.9786982' ],
                'CD' : [ 'Clarke 1880', '6378249.145', '293.465' ],
                'EA' : [ 'Everest (India 1830)', '6377276.345', '300.8017' ],
                'EB' : [ 'Everest (Sabah & Sarawak)', '6377298.556', '300.8017' ],
                'EC' : [ 'Everest (India 1956)', '6377301.243', '300.8017' ],
                'ED' : [ 'Everest (W. Malaysia 1969)', '6377295.664', '300.8017' ],
                'EE' : [ 'Everest (W. Malaysia & Singapore 1948)', '6377304.063', '300.8017' ],
                'EF' : [ 'Everest (Pakistan)', '6377309.613', '300.8017' ],
                'FA' : [ 'Modified Fischer 1960', '6378155', '298.3' ],
                'HE' : [ 'Helmert 1906', '6378200', '298.3' ],
                'HO' : [ 'Hough 1960', '6378270', '297' ],
                'ID' : [ 'Indonesian 1974', '6378160', '298.247' ],
                'IN' : [ 'International 1924', '6378388', '297' ],
                'KA' : [ 'Krassovsky 1940', '6378245', '298.3' ],
                'RF' : [ 'Geodetic Reference System 1980 (GRS 80)', '6378137', '298.257222101' ],
                'SA' : [ 'South American 1969', '6378160', '298.25' ],
                'WD' : [ 'WGS 72', '6378135', '298.26' ],
                'WE' : [ 'WGS 84', '6378137', '298.257223563' ]
            },
          
            nodeChanged: function() {},
            fieldChanged: function(fieldName) {
                Array.forEach(this._parentNodes, function (node) {
                    node.fieldChanged("coord");
                });
            },

            isLogitudeFirst: function(geoSystem) {
              for(var i=0; i<geoSystem.length; ++i)
                if(geoSystem[i] === 'longitude_first')
                  return true;
              
              return false;
            },

            UTMtoGC: function(geoSystem, coors) {
              x3dom.debug.logError('Not implemented GeoCoordinate: UTM');
            },
            
            GDtoGC: function(geoSystem, coords) {
            
              var output = new x3dom.fields.MFVec3f();
              
              var earthElipsoide = geoSystem[1];
              var radius = this.elipsoideParameters[earthElipsoide][1];
              var eccentricity = this.elipsoideParameters[earthElipsoide][2];
              var longitudeFirst = this.isLogitudeFirst(geoSystem);

              // large parts of this code from freeWRL
              var A = radius;
              var A2 = radius*radius;
              var F = 1.0/eccentricity;
              var C = A*(1.0 - F);
              var C2 = C*C;
              var Eps2 = F*(2.0 - F);
              var Eps25 = 0.25 * Eps2;
              
              var radiansPerDegree = 0.0174532925199432957692;

              // for (current in coords)
              for(var i=0; i<coords.length; ++i)
              {
                var current = new x3dom.fields.SFVec3f();
                
                var source_lat = radiansPerDegree * (longitudeFirst == true ? coords[i].y : coords[i].x);
                var source_lon = radiansPerDegree * (longitudeFirst == true ? coords[i].x : coords[i].y);

                var slat = Math.sin(source_lat);
                var slat2 = slat*slat;
                var clat = Math.cos(source_lat);

                /* square root approximation for Rn */
                var Rn = A / ( (0.25 - Eps25 * slat2 + 0.9999944354799/4.0) + (0.25-Eps25 * slat2)/(0.25 - Eps25 * slat2 + 0.9999944354799/4.0));

                var RnPh = Rn + coords[i].z;
                
                current.x = RnPh * clat * Math.cos(source_lon);
                current.y = RnPh * clat * Math.sin(source_lon);
                current.z = ((C2 / A2) * Rn + coords[i].z) * slat;

                output.push(current);
              }
              
              return output;
            },
            
            GEOtoGC: function(geoSystem, geoOrigin, coords)
            {
              if(geoSystem[0] == 'GD')
                return this.GDtoGC(geoSystem, coords);
              
              else if(geoSystem[0] == 'UTM')
                return this.UTMtoGC(geoSystem, coords);

              else if(geoSystem[0] == 'GC')
              {
                // Performance Hack
                // Normaly GDtoGC & UTMtoGC will create a copy
                // If we are already in GC & have an origin: we have to copy here
                // Else Origin will change original DOM elements

                if(geoOrigin.node)
                {
                  var copy = new x3dom.fields.MFVec3f();
                  for(var i=0; i<coors.length; ++i)
                  {
                    var current = new x3dom.fields.SFVec3f();
                    
                    current.x = coords[i].x;
                    current.y = coords[i].y;
                    current.z = coords[i].z;
                    
                    copy.push(current);
                  }
                  return copy;
                }
                else
                  return coords;
              }
              
              else
                x3dom.debug.logError('Unknown geoSystem: ' + geoSystem[0]);
            },

            OriginToGC: function(geoOrigin)
            {
              // dummy function to send a scalar to an array function
              var geoCoords = geoOrigin.node._vf.geoCoords;
              var geoSystem = geoOrigin.node._vf.geoSystem;

              var point = new x3dom.fields.SFVec3f;
              point.x = geoCoords.x;
              point.y = geoCoords.y;
              point.z = geoCoords.z;

              var temp = new x3dom.fields.MFVec3f;
              temp.push(point);

              // transform origin to GeoCentric
              var origin = this.GEOtoGC(geoSystem, geoOrigin, temp);
              
              return origin[0];
            },

            GEOtoX3D: function(geoSystem, geoOrigin, coords)
            {
              // transform points to GeoCentric
              var gc = this.GEOtoGC(geoSystem, geoOrigin, coords);

              // transform by origin
              if(geoOrigin.node)
              {
                // transform points by origin
                var origin = this.OriginToGC(geoOrigin);

                var matrix = x3dom.fields.SFMatrix4f.translation(origin);
                matrix = matrix.inverse();

                for(var i=0; i<coords.length; ++i)
                  gc[i] = matrix.multMatrixPnt(gc[i]);
              }

              return gc;
            },
            
            getPoints: function()
            {
              return this.GEOtoX3D(this._vf.geoSystem, this._cf.geoOrigin, this._vf.point);
            }
        }
    )
);

/* ### GeoElevationGrid ### */
x3dom.registerNodeType(
    "GeoElevationGrid",
    "Geospatial",
    defineClass(x3dom.nodeTypes.X3DGeometryNode,
        function (ctx) {
            x3dom.nodeTypes.GeoElevationGrid.superClass.call(this, ctx);

            this.addField_MFString(ctx, 'geoSystem', ['GD', 'WE']);
            this.addField_SFVec3d(ctx, 'geoGridOrigin', 0, 0, 0);
            this.addField_MFDouble(ctx, 'height', 0, 0);
            this.addField_SFBool(ctx, 'ccw', true);
            //this.addField_SFBool(ctx, 'colorPerVertex', true);
            //this.addField_SFDouble(ctx, 'creaseAngle', 0);
            //this.addField_SFBool(ctx, 'normalPerVertex', true);
            //this.addField_SFBool(ctx, 'solid', true);
            this.addField_SFInt32(ctx, 'xDimension', 0);
            this.addField_SFDouble(ctx, 'xSpacing', 1.0);
            this.addField_SFFloat(ctx, 'yScale', 1);
            this.addField_SFInt32(ctx, 'zDimension', 0);
            this.addField_SFDouble(ctx, 'zSpacing', 1.0);
            // this.addField_SFNode('color', x3dom.nodeTypes.PropertySetGeometry);
            // this.addField_SFNode('normal', x3dom.nodeTypes.PropertySetGeometry);
            // this.addField_SFNode('texCoord', x3dom.nodeTypes.PropertySetGeometry);
            this.addField_SFNode('geoOrigin', x3dom.nodeTypes.GeoOrigin);
            this.addField_SFBool(ctx, 'lit', true);
        },
        {
            nodeChanged: function() {

              var positions = new x3dom.fields.MFVec3f();
              var normals = new x3dom.fields.MFVec3f();
              var indices = new x3dom.fields.MFInt32();

              var geoSystem = this._vf.geoSystem;
              var geoOrigin = this._cf.geoOrigin;

              var height = this._vf.height;
              
              var yScale = this._vf.yScale;
              var xDimension = this._vf.xDimension;
              var zDimension = this._vf.zDimension;
              var xSpacing = this._vf.xSpacing;
              var zSpacing = this._vf.zSpacing;

              // check for no height == dimensions
              if(height.length !== (xDimension * zDimension))
                x3dom.debug.logError('GeoElevationGrid: height.length(' + height.length + ') != x/zDimension(' + xDimension + '*' + zDimension + ')');
              
              var longitude_first = x3dom.nodeTypes.GeoCoordinate.prototype.isLogitudeFirst(geoSystem);
              var ccw = this._vf.ccw;

              // heights to coords & normals
              for(var z=0; z<zDimension; ++z)
                for(var x=0; x<xDimension; ++x)
                {
                  var coord = new x3dom.fields.SFVec3f();
                  var normal = new x3dom.fields.SFVec3f(0,1,0);

                  if(longitude_first)
                  {
                    coord.x = x * xSpacing;
                    coord.y = z * zSpacing;
                  }
                  else
                  {
                    coord.x = z * zSpacing;
                    coord.y = x * xSpacing;
                  }
                  coord.z = height[z * xDimension + x] * yScale;

                  positions.push(coord);

                  normals.push(normal);
                }

              // create index buffer
              for(var z=0; z<(zDimension-1); z++)
              {
                for(var x=0; x<(xDimension-1); x++)
                {
                  var p0 = x + (z * xDimension);
                  var p1 = x + (z * xDimension) + 1;
                  var p2 = x + ((z + 1) * xDimension) + 1;
                  var p3 = x + ((z + 1) * xDimension);

                  if(ccw)
                  {
                    indices.push(p0);
                    indices.push(p1);
                    indices.push(p2);

                    indices.push(p0);
                    indices.push(p2);
                    indices.push(p3);
                  }
                  else
                  {
                    indices.push(p0);
                    indices.push(p3);
                    indices.push(p2);

                    indices.push(p0);
                    indices.push(p2);
                    indices.push(p1);
                  }
                }
              }

              // convert to x3dom coord system
              var transformed = x3dom.nodeTypes.GeoCoordinate.prototype.GEOtoX3D(geoSystem, geoOrigin, positions);

              // push to geometry
              this._mesh._normals[0] = normals.toGL();
              this._mesh._indices[0] = indices.toGL();
              this._mesh._positions[0] = transformed.toGL();

              this._mesh._invalidate = true;
              this._mesh._numFaces = this._mesh._indices[0].length / 3;
              this._mesh._numCoords = this._mesh._positions[0].length / 3;
            },

            fieldChanged: function(fieldName) {
            }
        }
    )
);

/* ### GeoLOD ### */
x3dom.registerNodeType(
    "GeoLOD",
    "Geospatial",
    defineClass(x3dom.nodeTypes.X3DChildNode,
        function (ctx) {
            x3dom.nodeTypes.GeoLOD.superClass.call(this, ctx);

            this.addField_MFString(ctx, 'geoSystem', 'GD','WE');
            this.addField_MFString(ctx, 'rootUrl', []);
            this.addField_MFString(ctx, 'child1Url', []);
            this.addField_MFString(ctx, 'child2Url', []);
            this.addField_MFString(ctx, 'child3Url', []);
            this.addField_MFString(ctx, 'child4Url', []);
            this.addField_SFVec3d(ctx, 'center', 0, 0, 0);
            this.addField_SFFloat(ctx, 'range', 10);
            this.addField_SFString(ctx, 'referenceBindableDescription', []);
            this.addField_SFNode('geoOrigin', x3dom.nodeTypes.ChildGroup);
            this.addField_SFNode('rootNode', x3dom.nodeTypes.ChildGroup);
            this.addField_SFString(ctx, 'triggerName', Synchronize);
            this.addField_SFNode('privateChild1Node', x3dom.nodeTypes.ChildGroup);
            this.addField_SFNode('privateChild2Node', x3dom.nodeTypes.ChildGroup);
            this.addField_SFNode('privateChild3Node', x3dom.nodeTypes.ChildGroup);
            this.addField_SFNode('privateChild4Node', x3dom.nodeTypes.ChildGroup);
            this.addField_SFNode('privateRootNode', x3dom.nodeTypes.ChildGroup);
        },
        {
            nodeChanged: function() {},
            fieldChanged: function(fieldName) {}
        }
    )
);

/* ### GeoLocation ### */
x3dom.registerNodeType(
    "GeoLocation",
    "Geospatial",
    defineClass(x3dom.nodeTypes.X3DGroupingNode,
        function (ctx) {
            x3dom.nodeTypes.GeoLocation.superClass.call(this, ctx);

            this.addField_MFString(ctx, 'geoSystem', 'GD','WE');
            this.addField_SFVec3d(ctx, 'geoCoords', 0, 0, 0);
            this.addField_SFNode('geoOrigin', x3dom.nodeTypes.ChildGroup);
        },
        {
            nodeChanged: function() {},
            fieldChanged: function(fieldName) {}
        }
    )
);

/* ### GeoMetadata ### */
x3dom.registerNodeType(
    "GeoMetadata",
    "Geospatial",
    defineClass(x3dom.nodeTypes.X3DInfoNode,
        function (ctx) {
            x3dom.nodeTypes.GeoMetadata.superClass.call(this, ctx);

            this.addField_MFString(ctx, 'url', []);
            this.addField_MFNode('data', x3dom.nodeTypes.InfoNode);
            this.addField_MFString(ctx, 'summary', []);
        },
        {
            nodeChanged: function() {},
            fieldChanged: function(fieldName) {}
        }
    )
);

/* ### GeoOrigin ### */
x3dom.registerNodeType(
    "GeoOrigin",
    "Geospatial",
    defineClass(x3dom.nodeTypes.X3DNode,
        function (ctx) {
            x3dom.nodeTypes.GeoOrigin.superClass.call(this, ctx);

            this.addField_MFString(ctx, 'geoSystem', 'GD', 'WE');
            this.addField_SFVec3d(ctx, 'geoCoords', 0, 0, 0);
            this.addField_SFBool(ctx, 'rotateYUp', false);
        },
        {
            nodeChanged: function() {},
            fieldChanged: function(fieldName) {}
        }
    )
);

/* ### GeoPositionInterpolator ### */
x3dom.registerNodeType(
    "GeoPositionInterpolator",
    "Geospatial",
    defineClass(x3dom.nodeTypes.X3DInterpolatorNode,
        function (ctx) {
            x3dom.nodeTypes.GeoPositionInterpolator.superClass.call(this, ctx);

            this.addField_MFString(ctx, 'geoSystem', 'GD','WE');
            this.addField_MFVec3d(ctx, 'keyValue', []);
            this.addField_SFNode('geoOrigin', x3dom.nodeTypes.LinearInterpolator);
        },
        {
            nodeChanged: function() {},
            fieldChanged: function(fieldName) {}
        }
    )
);

/* ### GeoProximitySensor ### */
x3dom.registerNodeType(
    "GeoProximitySensor",
    "Geospatial",
    defineClass(x3dom.nodeTypes.X3DEnvironmentalSensorNode,
        function (ctx) {
            x3dom.nodeTypes.GeoProximitySensor.superClass.call(this, ctx);

            this.addField_SFVec3d(ctx, 'geoCenter', 0, 0, 0);
            this.addField_SFNode('geoOrigin', x3dom.nodeTypes.EnvironmentSensor);
            this.addField_MFString(ctx, 'geoSystem', 'GD','WE');
        },
        {
            nodeChanged: function() {},
            fieldChanged: function(fieldName) {}
        }
    )
);

/* ### GeoTouchSensor ### */
x3dom.registerNodeType(
    "GeoTouchSensor",
    "Geospatial",
    defineClass(x3dom.nodeTypes.X3DTouchSensorNode,
        function (ctx) {
            x3dom.nodeTypes.GeoTouchSensor.superClass.call(this, ctx);

            this.addField_SFNode('geoOrigin', x3dom.nodeTypes.TouchSensor);
            this.addField_MFString(ctx, 'geoSystem', 'GD','WE');
        },
        {
            nodeChanged: function() {},
            fieldChanged: function(fieldName) {}
        }
    )
);

/* ### GeoTransform ### */
x3dom.registerNodeType(
    "GeoTransform",
    "Geospatial",
    defineClass(x3dom.nodeTypes.X3DGroupingNode,
        function (ctx) {
            x3dom.nodeTypes.GeoTransform.superClass.call(this, ctx);

            this.addField_SFVec3d(ctx, 'geoCenter', 0, 0, 0);
            this.addField_SFRotation(ctx, 'rotation', 0, 0, 1, 0);
            this.addField_SFVec3f(ctx, 'scale', 1, 1, 1);
            this.addField_SFRotation(ctx, 'scaleOrientation', 0, 0, 1, 0);
            this.addField_SFVec3f(ctx, 'translation', 0, 0, 0);
            this.addField_SFNode('geoOrigin', x3dom.nodeTypes.Transform);
            this.addField_MFString(ctx, 'geoSystem', 'GD','WE');
        },
        {
            nodeChanged: function() {},
            fieldChanged: function(fieldName) {}
        }
    )
);

/* ### GeoViewpoint ### */
x3dom.registerNodeType(
    "GeoViewpoint",
    "Geospatial",
    defineClass(x3dom.nodeTypes.X3DViewpointNode,
        function (ctx) {
            x3dom.nodeTypes.GeoViewpoint.superClass.call(this, ctx);

            this.addField_MFString(ctx, 'geoSystem', 'GD','WE');
            this.addField_SFFloat(ctx, 'fieldOfView', 0.785398);
            this.addField_SFRotation(ctx, 'orientation', 0, 0, 1, 0);
            this.addField_SFVec3d(ctx, 'position', 0, 0, 100000);
            this.addField_SFBool(ctx, 'headlight', true);
            this.addField_MFString(ctx, 'navType', EXAMINE);
            this.addField_SFFloat(ctx, 'speedFactor', 1.0);
            this.addField_SFNode('geoOrigin', x3dom.nodeTypes.ViewBindable);
        },
        {
            nodeChanged: function() {},
            fieldChanged: function(fieldName) {}
        }
    )
);