var $ = mdui.$;
var photoFile;
var photoCanvas = document.querySelector('#photo-canvas');
var photoCtx = photoCanvas.getContext('2d');
var photoExif;

const fontList = [null, 'MiSans', 'HarmonyOS Sans', 'OPPOSans', 'SF Pro Display'];

Date.prototype.format = function (fmt) {
    var o = {
        "M+": this.getMonth() + 1,
        "d+": this.getDate(),
        "h+": this.getHours(),
        "m+": this.getMinutes(),
        "s+": this.getSeconds(),
        "q+": Math.floor((this.getMonth() + 3) / 3),
        "S": this.getMilliseconds()
    };
    if (/(y+)/.test(fmt)) {
        fmt = fmt.replace(RegExp.$1, (this.getFullYear() + "").substr(4 - RegExp.$1.length));
    }
    for (var k in o) {
        if (new RegExp("(" + k + ")").test(fmt)) {
            fmt = fmt.replace(RegExp.$1, (RegExp.$1.length == 1) ? (o[k]) : (("00" + o[k]).substr(("" + o[k]).length)));
        }
    }
    return fmt;
}

function changeToDFM(du) {
    du = String(du);
    const arr1 = du.split(".");
    const d = arr1[0];
    let tp = "0." + arr1[1]
    tp = String(tp * 60); // 进行强制类型转换
    const arr2 = tp.split(".");
    const f = arr2[0];
    tp = "0." + arr2[1];
    tp = tp * 60;
    const m = tp.toFixed(0); // 保留两位小数
    const dfm = d + "°" + f + "'" + m + "\"";
    return dfm;
}

function chooseFile() {
    // 创建一个 input 元素，用于选择文件
    var fileInput = document.createElement('input');
    // 设置 input 元素的类型为 file
    fileInput.type = 'file';
    // 设置 input 元素接受的文件类型为 image
    fileInput.accept = 'image/*';
    // 模拟点击 input 元素，弹出文件选择框
    fileInput.click();
    // 禁用设备名称输入框
    $('#device-input').prop('disabled', true);
    // 禁用时间输入框
    $('#time-input').prop('disabled', true);
    // 禁用镜头信息输入框
    $('#lens-input').prop('disabled', true);
    // 禁用位置信息输入框
    $('#location-input').prop('disabled', true);

    // 当文件选择发生变化时
    fileInput.onchange = (e) => {
        console.log("fileInput.onchange", e);
        // 判断是否是 Safari 浏览器
        if (navigator.userAgent.indexOf('Safari/') > -1) {
            // 如果是 Safari 浏览器，则读取选择的文件
            readImage(e.target.files[0]);
        } else {
            // 如果不是 Safari 浏览器，则读取选择的文件
            readImage(e.path[0].files[0]);
        }
    }
}

function readImage(file) {
    // 将选择的文件赋值给 photoFile 变量
    photoFile = file;
    console.log("photoFile", photoFile);
    // 判断选择的文件是否为图片类型
    if (photoFile.type.indexOf('image') == -1) {
        // 如果不是图片类型，弹出提示
        mdui.snackbar({
            message: getI18n('please_select_a_image_file'),
            position: 'right-top'
        });
        return;
    }

    // 隐藏照片提示信息
    $('#photo-tip').addClass('mdui-hidden');
    // 显示加载中提示
    $('#photo-info').text(getI18n('loading'));
    $('#photo-info').removeClass('mdui-hidden');

    // 创建 FileReader 对象用于读取文件
    var reader = new FileReader();
    // 文件读取完成后执行
    reader.onload = (e) => {
        console.log("reader.onload", e);
        // 创建 Image 对象用于获取图片信息
        var photoImage = new Image();
        photoImage.src = e.target.result;
        // 图片加载完成后执行
        photoImage.onload = () => {
            // 显示图片文件名和宽高信息
            $('#photo-info').html(`${photoFile.name}<br />${photoImage.width}x${photoImage.height}`);

            // 初始化设备、时间、镜头和位置信息为 Unknown
            $('#device-input').val('Unknown');
            $('#time-input').val('Unknown');
            $('#lens-input').val('Unknown');
            $('#location-input').val('Unknown');

            // 使用 exifr 解析图片 EXIF 信息
            exifr.parse(e.target.result).then(res => {
                console.log(res);
                // 将 EXIF 信息保存到 photoExif 变量
                photoExif = res;
                // 如果 EXIF 中有 Model 信息，则显示设备型号
                if (res.Model) $('#device-input').val(res.Model);
                // 如果是小米手机，则显示设备型号
                if (res['39424'] && typeof res['39424'] == 'string') $('#device-input').val(res['39424']); // Xiaomi
                // 如果 EXIF 中有 CreateDate 信息，则显示拍摄时间
                if (res.CreateDate) $('#time-input').val(new Date(res.CreateDate).format('yyyy.MM.dd hh:mm:ss'));

                // 如果 EXIF 中有焦距信息，则显示镜头焦距
                if (res.FocalLength) $('#lens-input').val(`${parseInt(res.FocalLength)}mm`);
                if (res.FocalLengthIn35mmFormat) $('#lens-input').val(`${parseInt(res.FocalLengthIn35mmFormat)}mm`);
                // 如果 EXIF 中有光圈信息，则显示镜头光圈
                if (res.FNumber) $('#lens-input').val(`${$('#lens-input').val()} f/${res.FNumber.toFixed(1)}`);
                // 如果 EXIF 中有曝光时间信息，则显示镜头曝光时间
                if (res.ExposureTime) $('#lens-input').val(`${$('#lens-input').val()} 1/${parseInt(res.ExposureTime ** -1)}`);
                // 如果 EXIF 中有 ISO 信息，则显示镜头 ISO
                if (res.ISO) $('#lens-input').val(`${$('#lens-input').val()} ISO${res.ISO}`);
                //if (res.FocalLength && res.FNumber && res.ExposureTime && res.ISO) $('#lens-input').val(`${parseInt(res.FocalLength)}mm f/${res.FNumber.toFixed(1)} 1/${parseInt(res.ExposureTime ** -1)} ISO${res.ISO}`);
                // 如果 EXIF 中有 GPS 信息，则显示拍摄位置
                if (res.GPSLatitude && res.GPSLatitudeRef && res.GPSLongitude && res.GPSLongitudeRef) {
                    let latitude = res.GPSLatitude[0] + res.GPSLatitude[1] / 60 + res.GPSLatitude[2] / 3600;
                    let longitude = res.GPSLongitude[0] + res.GPSLongitude[1] / 60 + res.GPSLongitude[2] / 3600;
                    let latitudeDirection = res.GPSLatitudeRef === 'N' ? 'N' : 'S';
                    let longitudeDirection = res.GPSLongitudeRef === 'E' ? 'E' : 'W';
                    $('#location-input').val(`${latitude.toFixed(4)}°${latitudeDirection} ${longitude.toFixed(4)}°${longitudeDirection}`);
                } else {
                    // 如果没有 GPS 信息，则显示无位置信息
                    $('#location-input').val(getI18n('no_location_info'));
                }

                mdui.mutation();

                // 启用设备、时间、镜头和位置输入框
                $('#device-input').prop('disabled', false);
                $('#time-input').prop('disabled', false);
                $('#lens-input').prop('disabled', false);
                $('#location-input').prop('disabled', false);



                // 为输入框添加 mdui-textfield-not-empty 类，使其显示 label
                $('#device-input').parent('.mdui-textfield').addClass('mdui-textfield-not-empty');
                $('#time-input').parent('.mdui-textfield').addClass('mdui-textfield-not-empty');
                $('#lens-input').parent('.mdui-textfield').addClass('mdui-textfield-not-empty');
                $('#location-input').parent('.mdui-textfield').addClass('mdui-textfield-not-empty');
            });
            // 隐藏照片选择区域，显示 canvas 区域
            console.log("drawImage(true)");
            // 绘制图片到 canvas
            drawImage(true);

            // 如果是移动端 Safari 浏览器，且图片大小超过 5MB，则提示无法保存
            if (navigator.userAgent.indexOf('Mobile') > -1 && navigator.userAgent.indexOf('Safari/') > -1 && photoFile.size > 1024 ** 2 * 5) {
                mdui.snackbar({
                    message: getI18n('this_image_cannot_be_saved_in_safari'),
                    position: 'right-top'
                });
            }
        }
    }

    // 读取文件为 DataURL
    reader.readAsDataURL(photoFile);

    // 启用保存和预览按钮
    document.querySelector('#save-btn').disabled = false;
    document.querySelector('#preview-btn').disabled = false;
    // 设置保存按钮文字为保存
    $('#save-btn').text(getI18n('save'));
}

function previewImage() {
    $.showOverlay();
    var imageHeight;
    var exportQuality = (Number($('#quality-slider input').val()) - 5) / 100; // 图片质量降低5%
    photoCanvas.toBlob(canvasBlob => {
        imageHeight = `${document.body.clientWidth * .85 / photoCanvas.width * photoCanvas.height}px`;// 图片高度占屏幕宽度的85%
        $.hideOverlay();
        mdui.dialog({
            content: `<img src="${URL.createObjectURL(canvasBlob)}" width="100%" height="${imageHeight}" />`,
            cssClass: 'preview-dialog',
            buttons: [
                {
                    text: getI18n('cancel')
                },
                {
                    text: getI18n('save'),
                    onClick: () => {
                        saveImage();
                    }
                }
            ]
        });
    }, 'image/jpg', exportQuality);
}

function saveImage() {
    // 设置保存按钮文字为"保存中..."
    $('#save-btn').text(getI18n('saving'));
    // 禁用保存按钮，防止重复点击
    document.querySelector('#save-btn').disabled = true;
    // 获取图片质量，并降低5%
    var exportQuality = (Number($('#quality-slider input').val()) - 5) / 100;
    // 将 canvas 转换为 blob 对象
    photoCanvas.toBlob(canvasBlob => {
        // 创建一个 a 标签，用于下载图片
        var imageLink = document.createElement('a');
        // 设置下载的文件名
        imageLink.download = `watermark_${new Date().format('yyyyMMddhhmmss')}.jpg`;
        // 设置下载链接
        imageLink.href = URL.createObjectURL(canvasBlob);
        // 模拟点击 a 标签，开始下载
        imageLink.click();
        // 下载完成后，设置保存按钮文字为"保存"
        $('#save-btn').text(getI18n('save'));
        // 启用保存按钮
        document.querySelector('#save-btn').disabled = false;
    }, 'image/jpeg', exportQuality);
}

function getLocation() {
    mdui.snackbar({
        message: getI18n('getting_location'),
        position: 'right-top',
        timeout: 1000
    });
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(position => {
            mdui.snackbar({
                message: getI18n('getting_location_success'),
                position: 'right-top',
                timeout: 1000
            });
            let latitude = position.coords.latitude;
            let longitude = position.coords.longitude;
            let latitudeDirection = latitude >= 0 ? 'N' : 'S';
            let longitudeDirection = longitude >= 0 ? 'E' : 'W';
            $('#location-input').val(`${Math.abs(latitude)}°${latitudeDirection} ${Math.abs(longitude)}°${longitudeDirection}`);
            $('#location-input').parent('.mdui-textfield').addClass('mdui-textfield-not-empty');
            drawImage(true);
        }, () => {
            $('#location-input').val('64.9631°N -19.0208°W');
            $('#location-input').parent('.mdui-textfield').addClass('mdui-textfield-not-empty');
            mdui.snackbar({
                message: getI18n('location_is_iceland'),
                position: 'right-top'
            });
            drawImage(true);
            mdui.snackbar({
                message: getI18n('cant_get_your_location'),
                position: 'right-top'
            });
        });
    } else {
        mdui.snackbar({
            messsge: getI18n('geolocation_is_not_supported_by_this_browser'),
            position: 'right-top'
        });
    }
}

function matchModel() {
    if (photoExif.Make && photoExif.Model) {
        mdui.snackbar({
            message: getI18n('matching'),
            position: 'right-top'
        });
        $.ajax({
            url: './model.json',
            dataType: 'json',
            success: res => {
                if (res[photoExif.Make] && res[photoExif.Make][photoExif.Model]) {
                    $('#device-input').val(res[photoExif.Make][photoExif.Model]);
                    drawImage(true);
                } else {
                    mdui.snackbar({
                        message: getI18n('model_not_found'),
                        position: 'right-top'
                    });
                }
            },
            error: () => {
                mdui.snackbar({
                    message: getI18n('cannot_get_model_list'),
                    position: 'right-top'
                });
            }
        });
    } else {
        mdui.snackbar({
            message: getI18n('cannot_match_unknown_model'),
            position: 'right-top'
        });
    }
}


function drawImage(preview) {
    // 获取主题颜色,false为黑色，true为白色
    var photoTheme = $('#photo-toggle i').text() === 'brightness_3' ? false : true;

    // 如果 preview 未定义，则设置为 false
    if (typeof preview == 'undefined') preview = false;
    // 创建 FileReader 对象
    var reader = new FileReader();
    // 当 FileReader 读取文件完成时
    reader.onload = (e) => {
        // 创建 Image 对象
        var photoImage = new Image();
        // 设置 Image 对象的 src 属性为读取的文件内容
        photoImage.src = e.target.result;
        // 当 Image 对象加载完成时
        photoImage.onload = () => {
            // 获取图片宽度
            var photoWidth = photoImage.width;
            // 获取图片高度
            var photoHeight = photoImage.height;

            // 如果缩放选择为 2，则将图片宽高都乘以 2
            var zoom = parseInt($('#zoom-select').val());
            if (zoom != 1) {
                photoWidth = photoWidth * zoom;
                photoHeight = photoHeight * zoom;
            }

            // 设置 canvas 宽度
            photoCanvas.width = photoWidth;
            // 设置 canvas 高度，增加 614 用于显示文字信息
            photoCanvas.height = photoHeight + 614;

            // 设置 canvas 背景色为白色
            photoCtx.fillStyle = photoTheme ? 'white' : 'black';
            // 填充 canvas 背景
            photoCtx.fillRect(0, 0, photoCanvas.width, photoCanvas.height);
            // 将图片绘制到 canvas 上
            photoCtx.drawImage(photoImage, 0, 0, photoWidth, photoHeight);

            // 设置字体样式
            photoCtx.font = `bold 120px ${fontList[parseInt($('#font-select').val())]}`;
            // 设置字体颜色为黑色
            photoCtx.fillStyle = !photoTheme ? 'white' : 'black';

            // 获取镜头信息文本的宽度
            var specLength = photoCtx.measureText($('#lens-input').val()).width;

            // 在 canvas 上绘制相机名称信息，200是左边距
            photoCtx.fillText($('#device-input').val(), 200, photoHeight + 282);
            // 在 canvas 上绘制镜头信息，200是右边距
            photoCtx.fillText($('#lens-input').val(), photoWidth - specLength - 200, photoHeight + 282);


            // 设置字体样式
            photoCtx.font = `normal 82px ${fontList[parseInt($('#font-select').val())]}`;
            // 设置 canvas 字符间距
            photoCanvas.style.letterSpacing = '1px';
            // 设置字体颜色
            photoCtx.fillStyle = '#727272';
            // 在 canvas 上绘制时间信息
            photoCtx.fillText($('#time-input').val(), 200, photoHeight + 434);
            // 在 canvas 上绘制位置信息
            photoCtx.fillText($('#location-input').val(), photoWidth - specLength - 200, photoHeight + 434);
            console.log("进入选择logo函数");
            // 如果选择了 logo
            if ($('#logo-select').val() != 'none') {
                // 创建 logo Image 对象
                var logoImage = new Image();
                // 设置 logo Image 对象的 src 属性
                logoImage.src = logoList[$('#logo-select').val()];
                console.log("logoImage.src", $('#logo-select').val());
                // 当 logo Image 对象加载完成时
                logoImage.onload = () => {
                    var logoHeight = 250;
                    var pianyi = 30;
                    if ($('#logo-select').val().includes('sony') || $('#logo-select').val().includes('canon') || $('#logo-select').val().includes('fujifilm')) {
                        pianyi = 200;
                    }
                    // 将 logo 绘制到 canvas 上
                    photoCtx.drawImage(logoImage, photoWidth - specLength - 600 - pianyi, photoHeight + 180 - (pianyi / 2), logoHeight + pianyi, logoHeight + pianyi);

                    // 绘制 logo 分割线
                    photoCtx.moveTo(photoWidth - specLength - 280, photoHeight + 190);
                    photoCtx.lineTo(photoWidth - specLength - 280, photoHeight + 190 + logoHeight);
                    photoCtx.lineWidth = 10;
                    photoCtx.strokeStyle = '#cccccc';
                    photoCtx.stroke();

                    // 如果是预览模式
                    if (preview) {
                        // 获取图片质量
                        var exportQuality = (Number($('#quality-slider input').val()) - 5) / 100; // 图片质量降低5%
                        var previewQuality = exportQuality / 5;
                        // 将 canvas 转换为 blob 对象
                        photoCanvas.toBlob(canvasBlob => {
                            // 设置 #photo-canvas-div 的样式
                            $('#photo-canvas-div').css({
                                'display': 'flex',
                                'justify-content': 'center',
                                'align-items': 'center'
                            });

                            if (photoCanvas.height > photoCanvas.width) {
                                $('#photo-canvas-div').css({
                                    'width': 'auto',
                                    'height': '700px'
                                });

                                $('#photo-preview').attr('width', 'auto'); // 图片宽度占满容器
                                $('#photo-preview').attr('height', '100%'); // 图片高度自动调整
                            } else {
                                $('#photo-canvas-div').css({
                                    'width': '800px',
                                    'height': 'auto'
                                });
                                $('#photo-preview').attr('width', '800px'); // 图片宽度自动调整
                                $('#photo-preview').attr('height', 'auto'); // 图片高度占满容器
                            }

                            // 设置预览图的 src 属性
                            $('#photo-preview').attr('src', URL.createObjectURL(canvasBlob));
                            $('#photo-area').addClass('mdui-hidden');
                            $('#photo-container').removeClass('mdui-hidden');
                            $('#photo-canvas-div').removeClass('mdui-hidden');
                        }, 'image/jpeg', previewQuality);
                    } else {
                        // 保存图片
                        saveImage();
                    }
                }
            } else {
                // 如果没有选择 logo
                if (preview) {
                    // 获取图片质量
                    var exportQuality = (Number($('#quality-slider input').val()) - 5) / 100; // 图片质量降低5%
                    var previewQuality = exportQuality / 5;
                    // 将 canvas 转换为 blob 对象
                    photoCanvas.toBlob(canvasBlob => {

                        // 设置 #photo-canvas-div 的样式
                        $('#photo-canvas-div').css({
                            'display': 'flex',
                            'justify-content': 'center',
                            'align-items': 'center'
                        });

                        if (photoCanvas.height > photoCanvas.width) {
                            $('#photo-canvas-div').css({
                                'width': 'auto',
                                'height': '700px'
                            });

                            $('#photo-preview').attr('width', 'auto'); // 图片宽度占满容器
                            $('#photo-preview').attr('height', '100%'); // 图片高度自动调整
                        } else {
                            $('#photo-canvas-div').css({
                                'width': '800px',
                                'height': 'auto'
                            });
                            $('#photo-preview').attr('width', '800px'); // 图片宽度自动调整
                            $('#photo-preview').attr('height', 'auto'); // 图片高度占满容器
                        }

                        // 设置预览图的 src 属性
                        $('#photo-preview').attr('src', URL.createObjectURL(canvasBlob));
                        console.log("canvasBlob", canvasBlob);
                        $('#photo-area').addClass('mdui-hidden');
                        $('#photo-container').removeClass('mdui-hidden');
                        $('#photo-canvas-div').removeClass('mdui-hidden');
                        console.log("previewQuality", previewQuality);
                    }, 'image/jpeg', previewQuality);
                } else {
                    // 保存图片
                    saveImage();
                }
            }
        }
    };

    // 读取图片文件
    reader.readAsDataURL(photoFile);
}



function showModelEditor() {
    if ($('#device-input').val() == 'Unknown') {
        var deviceMake = photoExif.Make || '';
        mdui.dialog({
            title: getI18n('model_editor'),
            content: `<div class="mdui-textfield mdui-textfield-floating-label"><label class="mdui-textfield-label">${getI18n('camera_manufactor')}</label><input id="editor-make" class="mdui-textfield-input" type="text" value="${deviceMake}" /></div><div class="mdui-textfield mdui-textfield-floating-label"><label class="mdui-textfield-label">${getI18n('camera_model')}</label><input id="editor-model" class="mdui-textfield-input" type="text" /></div>`,
            buttons: [
                {
                    text: getI18n('cancel')
                },
                {
                    text: getI18n('ok'),
                    close: false,
                    onClick: () => {
                        if ($('#editor-make').val() != '' && $('#editor-model').val() != '') {
                            photoExif.Make = $('#editor-make').val();
                            photoExif.Model = $('#editor-model').val();
                            $('#device-input').val(photoExif.Model);
                            drawImage(true);
                            history.back();
                        } else {
                            mdui.snackbar({
                                message: getI18n('please_fill_in_each_blank'),
                                position: 'right-top'
                            });
                        }
                    }
                }
            ]
        });
    } else {
        mdui.snackbar({
            message: getI18n('you_can_only_edit_unknown_model'),
            position: 'right-top'
        });
    }
}

function getFAQ() {
    var faqContent;
    $.ajax({
        url: `./faq_${langType}.html`,
        async: false,
        success: res => {
            faqContent = res;
        },
        error: () => {
            $.ajax({
                url: './faq_en-us.html',
                async: false,
                success: res => {
                    faqContent = res;
                }
            });
            mdui.snackbar({
                message: getI18n('failed_to_load_faq_content'),
                position: 'right-top'
            });
        }
    });

    mdui.dialog({
        title: getI18n('faq'),
        content: faqContent,
        buttons: [
            {
                text: getI18n('ok')
            }
        ]
    });
}

function getContributors() {
    $.showOverlay();
    $.ajax({
        url: 'https://api.github.com/repos/LTDSA/Photomark/contributors',
        dataType: 'json',
        complete: () => {
            $.hideOverlay();
        },
        success: res => {
            var listLayout = '';
            res.forEach(i => {
                listLayout += `<div class="mdui-list-item"><div class="mdui-list-item-avatar"><img src="${i.avatar_url}"/></div><div class="mdui-list-item-content"><div class="mdui-list-item-title">${i.login}</div><div class="mdui-list-item-text">${i.contributions} ${getI18n('contributions')}</div></div></div>`
            });
            mdui.dialog({
                title: getI18n('contributors'),
                content: `<div class="mdui-list">${listLayout}</div>`,
                buttons: [
                    {
                        text: getI18n('ok')
                    }
                ]
            });
        },
        error: () => {
            mdui.snackbar({
                message: 'Cannot load contributors',
                position: 'right-top'
            });
        }
    });
}

$('#photo-area').on('dragover', function (e) {
    e.preventDefault();
    e.stopPropagation();

    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        $('#photo-area').addClass('mdui-color-grey-800');
        $('#photo-area').removeClass('mdui-color-grey-700');
    } else {
        $('#photo-area').addClass('mdui-color-grey-300');
        $('#photo-area').removeClass('mdui-color-grey-200');
    }
});

$('#photo-area').on('drop', function (e) {
    e.preventDefault();
    e.stopPropagation();

    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        $('#photo-area').removeClass('mdui-color-grey-800');
        $('#photo-area').addClass('mdui-color-grey-700');
    } else {
        $('#photo-area').removeClass('mdui-color-grey-300');
        $('#photo-area').addClass('mdui-color-grey-200');
    }

    console.log(e);

    readImage(e.dataTransfer.files[0]);
});

$('#photo-preview').on('dragover', function (e) {
    e.preventDefault();
    e.stopPropagation();
});

$('#photo-canvas-div').on('drop', function (e) {
    e.preventDefault();
    e.stopPropagation();

    console.log(e);

    readImage(e.dataTransfer.files[0]);
});

$('#font-select').on('change', () => {
    $('body').removeClass('harmony-sans');
    $('body').removeClass('oppo-sans');
    $('body').removeClass('sf-pro');
    switch (parseInt($('#font-select').val())) {
        case 1:
            //$('body').removeClass('harmony-sans');
            break;
        case 2:
            $('body').addClass('harmony-sans');
            break;
        case 3:
            $('body').addClass('oppo-sans');
            break;
        case 4:
            $('body').addClass('sf-pro');
            break;
    }

    mdui.snackbar({
        message: getI18n('changing_font_please_wait'),
        position: 'right-top'
    });

    drawImage(true);
});

$('#logo-select').on('change', () => {
    drawImage(true);
});

$('#zoom-select').on('change', () => {
    drawImage(true);
});

$('#quality-slider input').on('input', function () {
    let value = $(this).val();
    let displayText = value === "100" ? "原图" : value + "%";
    $('#quality-value').text(displayText);
    drawImage(true);

});

var isDarkMode = false; // 初始为浅色模式
var currentHour = new Date().getHours();
if (currentHour < 8 || currentHour >= 22) {
    isDarkMode = true;
    $('body').addClass('mdui-theme-layout-dark');
    $('#photo-area').removeClass('mdui-color-grey-200');
    $('#photo-area').addClass('mdui-color-grey-700');
    $('#theme-toggle i').text('brightness_7'); // 切换为深色模式图标
}

$('#theme-toggle').on('click', function () {
    $('body').addClass('mdui-theme-transition');
    $('#photo-area').addClass('mdui-theme-transition');
    setTimeout(() => {
        $('body').removeClass('mdui-theme-transition');
        $('#photo-area').removeClass('mdui-theme-transition');
    }, 300);
    if (isDarkMode) {
        $('body').removeClass('mdui-theme-layout-dark');
        $('#photo-area').removeClass('mdui-color-grey-700');
        $('#photo-area').addClass('mdui-color-grey-200');
        $('#theme-toggle i').text('brightness_7'); // 切换为浅色模式图标
    } else {
        $('body').addClass('mdui-theme-layout-dark');
        $('#photo-area').removeClass('mdui-color-grey-200');
        $('#photo-area').addClass('mdui-color-grey-700');
        $('#theme-toggle i').text('brightness_4'); // 切换为深色模式图标
    }
    isDarkMode = !isDarkMode;
});

// 黑白边框切换，需要改变一些logo
$('#photo-toggle').on('click', function () {
    // 获取当前标签值
    var currentValue = $('#photo-toggle i').text();
    if (currentValue === 'wb_sunny') {
        $('#logo-select option[value="sony_dark"]').css('display', 'block');
        $('#logo-select option[value="sony"]').css('display', 'none');
        $('#logo-select option[value="hasselblad_dark"]').css('display', 'block');
        $('#logo-select option[value="hasselblad"]').css('display', 'none');
        $('#logo-select option[value="fujifilm_dark"]').css('display', 'block');
        $('#logo-select option[value="fujifilm"]').css('display', 'none');
        if ($('#logo-select').val() == 'sony' || $('#logo-select').val() == 'hasselblad' || $('#logo-select').val() == 'fujifilm')  {
            $('#logo-select').val($('#logo-select').val() + '_dark');
        }
        console.log($('#logo-select').val());
        $('#photo-toggle i').text('brightness_3');
        console.log("daozzheli");

        drawImage(true);
    } else {
        $('#logo-select option[value="sony_dark"]').css('display', 'none');
        $('#logo-select option[value="sony"]').css('display', 'block');
        $('#logo-select option[value="hasselblad_dark"]').css('display', 'none');
        $('#logo-select option[value="hasselblad"]').css('display', 'block');
        $('#logo-select option[value="fujifilm_dark"]').css('display', 'none');
        $('#logo-select option[value="fujifilm"]').css('display', 'block');
        if ($('#logo-select').val().includes('sony') || $('#logo-select').val().includes('hasselblad') || $('#logo-select').val().includes('fujifilm')) {
            $('#logo-select').val($('#logo-select').val().replace('_dark', ''));
        }
        $('#photo-toggle i').text('wb_sunny');
        drawImage(true);
    }
});

$('#device-input').on('input', function () {
    drawImage(true);
});

$('#time-input').on('input', function () {
    drawImage(true);
});

$('#lens-input').on('input', function () {
    drawImage(true);
});

$('#location-input').on('input', function () {
    drawImage(true);
});

// 动画开关状态，默认关闭
let isAnimationOn = false;

// 初始应用动画状态
applyAnimationState();

// 动画开关按钮点击事件
$('#animation-toggle').on('click', function () {
    // 切换动画状态
    isAnimationOn = !isAnimationOn;
    // 更新按钮图标
    $(this).find('i').text(isAnimationOn ? 'blur_off' : 'blur_on');
    // 应用动画状态
    applyAnimationState();
});

// 应用动画状态的函数
function applyAnimationState() {
    if (isAnimationOn) {
        $('body').removeClass('animation-off');
    } else {
        $('body').addClass('animation-off');
    }
}

// 新增：背景图片状态，默认关闭
let isBackgroundOn = true;
applyBackgroundState();

// 新增：背景图片切换按钮点击事件
$('#background-toggle').on('click', function () {
    // 切换背景图片状态
    isBackgroundOn = !isBackgroundOn;
    // 更新按钮图标
    $('#background-toggle i').text(isBackgroundOn ? 'photo_size_select_large' : 'wallpaper');
    // 应用背景图片状态
    applyBackgroundState();
});

// 新增：应用背景图片状态的函数
function applyBackgroundState() {
    if (isBackgroundOn) {
        // 添加背景图片样式
        $('body').addClass('background-image');
    } else {
        // 移除背景图片样式
        $('body').removeClass('background-image');
    }
}