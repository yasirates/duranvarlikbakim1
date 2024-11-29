sap.ui.define(["sap/ui/core/Fragment", "sap/m/MessageToast", "xlsx"],
    function (Fragment, MessageToast, XLSX) {
        'use strict';
        var oExcelValueArray = [];
        return {
            excelSheetsData: [],
            pDialog: null,
            openExcelDialog: function (oEvent) {

                //console.log(XLSX.version)
                this.excelSheetsData = [];

                /*
                var oView = this.getView();
                if (!this.pDialog) {
                    Fragment.load({
                        id: "excel_upload",
                        name: "duranvarlikbakim1.ext.fragment.ExcelUpload",
                        type: "XML",
                        controller: this 
                    }).then((oDialog) => {
                        var oFileUploader = Fragment.byId("excel_upload", "uploadSetDV");
                        oFileUploader.removeAllItems();
                        this.pDialog = oDialog;
                        this.pDialog.open();                         
                    })
                        .catch(error => alert(error.message));
                } else {
                    var oFileUploader = Fragment.byId("excel_upload", "uploadSetDV");
                    oFileUploader.removeAllItems();
                    this.pDialog.open();
                }
                    */

                var that = this;
                if (!that.pDialog) {
                    that.pDialog = sap.ui.xmlfragment("duranvarlikbakim1.ext.fragment.ExcelUpload", this);
                    that.getView().addDependent(that.pDialog);
                }
                this.pDialog.open();


                var oInput = sap.ui.getCore().byId("fUploadDV");
                if (oInput) {
                    oInput.setValue("");
                }
            },
            onUploadSet: function (oEvent) {
                //if (!this.excelSheetsData.length) {
                //    MessageToast.show("Dosya seçimi yapınız!");
                //    return;
                //}
                var oInput = sap.ui.getCore().byId("fUploadDV");
                var oInputPath = oInput.getValue();

                if (!oExcelValueArray.length || oInputPath === "") {
                    MessageToast.show("Dosya seçimi yapınız!");
                } else {
                    var that = this;
                    var oSource = oEvent.getSource();

                    // creating a promise as the extension api accepts odata call in form of promise only
                    var fnAddMessage = function () {
                        return new Promise((fnResolve, fnReject) => {
                            that.callOdata(fnResolve, fnReject);
                        });
                    };

                    var mParameters = {
                        sActionLabel: oSource.getText() // or "Your custom text" 
                    };
                    // calling the oData service using extension api
                    this.extensionAPI.securedExecution(fnAddMessage, mParameters);

                    this.pDialog.close();
                }
            },
            onCloseDialog: function (oEvent) {
                this.pDialog.close();
            },
            onBeforeUploadStart: function (oEvent) {
                console.log("File Before Upload Event Fired!!!")
                /* TODO: check for file upload count */
            },
            onUploadSetComplete: function (oEvent) {
                // getting the UploadSet Control reference
                var oFileUploader = Fragment.byId("excel_Upload", "uploadSetDV");
                // since we will be uploading only 1 file so reading the first file object
                var oFile = oFileUploader.getItems()[0].getFileObject();

                var reader = new FileReader();
                var that = this;

                reader.onload = (e) => {
                    // getting the binary excel file content
                    let xlsx_content = e.currentTarget.result;

                    let workbook = XLSX.read(xlsx_content, { type: 'binary' });
                    // here reading only the excel file sheet- Sheet1
                    var excelData = XLSX.utils.sheet_to_row_object_array(workbook.Sheets["Sheet1"]);

                    workbook.SheetNames.forEach(function (sheetName) {
                        // appending the excel file data to the global variable
                        that.excelSheetsData.push(XLSX.utils.sheet_to_row_object_array(workbook.Sheets[sheetName]));
                    });
                    console.log("Excel Data", excelData);
                    console.log("Excel Sheets Data", this.excelSheetsData);
                };
                reader.readAsBinaryString(oFile);

                MessageToast.show("Upload Successful");
            },
            onItemRemoved: function (oEvent) {
                this.excelSheetsData = [];
            },
            onTempDownload: function (oEvent) {
                var oModel = this.getView().getModel();
                // get the property list of the entity for which we need to download the template
                var oBuilding = oModel.getServiceMetadata().dataServices.schema[0].entityType.find(x => x.name === 'DuranVarlikBakimType');
                // set the list of entity property, that has to be present in excel file template
                var propertyList = ['Bukrs', 'Anln1', 'Anln2', 'Rldnr', 'DepreciationArea', 'Bldat', 'Budat', 'Rfdat', 'Bktxt', 'Shkzg', 'PurchaseYear', 'RevalAmount', 'DepreAmount', 'Waers', 'Zuonr', 'Sgtxt', 'ValuationDate', 'EndexDate'];

                var excelColumnList = [];
                var colList = {};

                // finding the property description corresponding to the property id
                propertyList.forEach((value, index) => {
                    let property = oBuilding.property.find(x => x.name === value);
                    colList[property.extensions.find(x => x.name === 'label').value] = '';
                });
                excelColumnList.push(colList);

                // initialising the excel work sheet
                const ws = XLSX.utils.json_to_sheet(excelColumnList);
                // creating the new excel work book
                const wb = XLSX.utils.book_new();
                // set the file value
                XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
                // download the created excel file
                XLSX.writeFile(wb, 'DuranVarlik_Bakim_Sablon.xlsx');

                MessageToast.show("Şablon indiriliyor...");
            },
            // helper method to call OData
            callOdata: function (fnResolve, fnReject) {
                //  intializing the message manager for displaying the odata response messages
                var oModel = this.getView().getModel();

                // creating odata payload object for Building entity
                var payload = {};

                //this.excelSheetsData[0].forEach((value, index) => {
                oExcelValueArray.forEach((value, index) => {
                    // setting the payload data
                    if (index !== 0) {
                        var bldat = null;
                        var budat = null;
                        var rfdat = null;
                        var valuation_date = null;
                        var index_date = null;

                        bldat = value["F_Value"];
                        budat = value["G_Value"];
                        rfdat = value["H_Value"];
                        valuation_date = value["Q_Value"];
                        index_date = value["R_Value"];


                        bldat = bldat.substr(6, 4) + "-" + bldat.substr(3, 2) + "-" + bldat.substr(0, 2) + "T00:00:00";
                        budat = budat.substr(6, 4) + "-" + budat.substr(3, 2) + "-" + budat.substr(0, 2) + "T00:00:00";
                        rfdat = rfdat.substr(6, 4) + "-" + rfdat.substr(3, 2) + "-" + rfdat.substr(0, 2) + "T00:00:00";
                        valuation_date = valuation_date.substr(6, 4) + "-" + valuation_date.substr(3, 2) + "-" + valuation_date.substr(0, 2) + "T00:00:00";
                        index_date = index_date.substr(6, 4) + "-" + index_date.substr(3, 2) + "-" + index_date.substr(0, 2) + "T00:00:00";

                        payload = {
                            "Bukrs": value["A_Value"],                             //Şirket Kodu
                            "Anln1": value["B_Value"],                             //Duran varlık
                            "Anln2": value["C_Value"],                             //Alt numara
                            "Rldnr": value["D_Value"],                             //Defter
                            "DepreciationArea": value["E_Value"],                  //Değerleme Alanı
                            "Bldat": bldat.toString(),                             //Belge tarihi
                            "Budat": budat.toString(),                             //Kayıt tarihi
                            "Rfdat": rfdat.toString(),                             //Referans Tarih
                            "Bktxt": value["I_Value"].toString(),                  //Belge başlığı metni
                            "Shkzg": value["J_Value"].toString(),                  //Borç/alacak gös.
                            "PurchaseYear": value["K_Value"].toString(),           //Satınalma Yılı
                            "RevalAmount": value["L_Value"].toString(),            //Yeniden Değ.Tutarı
                            "DepreAmount": value["M_Value"].toString(),            //Amortisman Yn.Dğ.Tu
                            "Waers": value["N_Value"].toString(),            //Para Birimi
                            "Zuonr": value["O_Value"].toString(),                  //Tayin
                            "Sgtxt": value["P_Value"].toString(),                  //Kalem Metni 
                            "ValuationDate": valuation_date.toString(),           //Değerleme Tarihi
                            "EndexDate": index_date.toString()                   //Endeks Tarihi  
                        };

                        // calling the odata service
                        oModel.create("/DuranVarlikBakim", payload, {
                            success: (result) => {
                                console.log(result);
                                var oMessageManager = sap.ui.getCore().getMessageManager();
                                var oMessage = new sap.ui.core.message.Message({
                                    //message: "Building Created with ID: " + result.Bukrs,
                                    message: "Tabloya kayıt edildi",
                                    persistent: true, // create message as transition message
                                    type: sap.ui.core.MessageType.Success
                                });
                                oMessageManager.addMessages(oMessage);
                                fnResolve();
                            },
                            error: fnReject
                        });
                    };
                });
            },

            onFUploadTypeMissmatch: function (oEvent) {
                var aFileTypes = oEvent.getSource().getFileType();
                aFileTypes.map(function (sType) {
                    return "*." + sType;
                });
                sap.m.MessageToast.show("Seçilen *." + oEvent.getParameter("fileType") +
                    " dosya tipi desteklenmiyor. Desteklenen tipler: " +
                    aFileTypes.join(", "));
            },

            onFUploadValueChange: function (oEvent) {
                var fileList = oEvent.getParameter("files");
                if (typeof fileList === "undefined" || fileList.length === 0) {
                    return;
                }

                var that = this;
                var file = fileList[0];
                var fileReader = new FileReader();
                fileReader.onload = function (e) {
                    that.processData(e.target.result);
                };
                fileReader.readAsArrayBuffer(file);
            },

            processData: function (raw) {
                debugger;
                //var oExcelValueArray = [];
                oExcelValueArray = [];
                var oWorkBook = new ExcelJS.Workbook();
                oWorkBook.xlsx.load(raw).then(function (data) {
                    var oWorksheet = oWorkBook.getWorksheet(oWorkBook.worksheets[0].Name)
                    oWorksheet.eachRow({ includeEmpty: true }, function (row, rowNumber) {
                        var oRow = oWorksheet.getRow(rowNumber);
                        var oExcelValueObject = {};

                        for (let index = 1; index <= oWorksheet.columnCount; index++) {
                            var text = "";
                            text = oWorksheet.getRow(rowNumber).getCell(index).text;
                            var cell = oWorksheet.getRow(rowNumber).getCell(index);
                            if (cell.numFmt === "dd/mm/yyyy" || cell.numFmt === "mm-dd-yy") {
                                if (Object.prototype.toString.call(new Date(cell.text)) === "[object Date]") {
                                    if (isNaN(new Date(cell.text))) {
                                    } else {
                                        const day = new Date(cell.text);
                                        const yyyy = day.getFullYear();
                                        let mm = day.getMonth() + 1;
                                        let dd = day.getDate();
                                        if (dd < 10) dd = '0' + dd;
                                        if (mm < 10) mm = '0' + mm;
                                        text = dd + '.' + mm + '.' + yyyy;
                                    }
                                }
                            }
                            oExcelValueObject[cell._column.letter + "_Value"] = text;
                        }
                        debugger;
                        oExcelValueArray.push(oExcelValueObject);

                    });
                    debugger;
                });
            },

        };
    });