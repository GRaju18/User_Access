sap.ui.define([
	"com/9b/userAccess/controller/BaseController",
	"sap/ui/core/Fragment",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
	"com/9b/userAccess/model/models",
	"sap/ndc/BarcodeScanner",
	"sap/ui/core/format/DateFormat"
], function (BaseController, Fragment, Filter, FilterOperator, model, BarcodeScanner, DateFormat) {
	"use strict";

	return BaseController.extend("com.9b.userAccess.controller.DetailPages", {
		formatter: model,

		onInit: function () {
			// this.getAppConfigData();
			// this.loadMasterData();
			// var labResultsTable = this.getView().byId("labResultsTable");
			// var tableHeader = this.byId("tableHeader");
			// labResultsTable.addEventDelegate({
			// 	onAfterRendering: function () {
			// 		var oBinding = this.getBinding("rows");
			// 		oBinding.attachChange(function (oEvent) {
			// 			var oSource = oEvent.getSource();
			// 			var count = oSource.iLength; //Will fetch you the filtered rows length
			// 			var totalCount = oSource.oList.length;
			// 			tableHeader.setText("Batches (" + count + "/" + totalCount + ")");
			// 		});
			// 	}
			// }, labResultsTable);
			this.combinedFilter = [];
			this.getOwnerComponent().getRouter(this).attachRoutePatternMatched(this._objectMatched, this);
		},

		_objectMatched: function (oEvent) {
			if (oEvent.getParameter("name") === "labResults") {
				sap.ui.core.BusyIndicator.hide();
				this.getOwnerComponent().getModel("jsonModel").setProperty("/tagArray", []);
				this.docNoLisence = oEvent.getParameter("arguments").docNo;
				// this.loadMasterData();
			}
		},

		/** Method for clear all filters**/
		clearAllFilters: function () {
			// this.onCloseRefreshChart();
			// var filterTable = this.getView().byId("labResultsTable");
			// var aColumns = filterTable.getColumns();
			// for (var i = 0; i <= aColumns.length; i++) {
			// 	filterTable.filter(aColumns[i], null);
			// 	filterTable.sort(aColumns[i], null);
			// }
			// this.byId("searchFieldTable").removeAllTokens();

		},
		
		// loadMasterData: function (filters) {
		// 	//	this.clearAllFilters();
		// 	var that = this;
		// 	var jsonModel = this.getOwnerComponent().getModel("jsonModel");
		// 	var compressedData=[];
		// 	var oClickedRowData = JSON.parse(that.docNoLisence);

		// 	// https://glasshouseweb.seedandbeyond.com:50000/b1s/v1/Users?$select=InternalKey,UserCode,UserName,U_License
		// 	var fields = "?$select=U_MetrcLicense,U_MetrcLocation,Sublevel2,BinCode,AbsEntry,Warehouse";
		// 	this.getView().setBusy(true);
		// 	this.readServiecLayer("/b1s/v2/BinLocations" + fields , function (data) {
					
					
		// 		var locations=[];
		// 		$.each(data.value, function(i,n){
		// 			if(n.U_MetrcLicense != null){
		// 				locations.push(n);
		// 			}
		// 		});	
					
					
		// 		jsonModel.setProperty("/binLocationData", locations);
		// 		// var cloneTableData = jsonModel.getProperty("/cloneTableData");
		// 		// var oClickedRowData = jsonModel.getProperty("/oClickedRowData");
		// 		this.getView().setBusy(false);
		// 		$.each(oClickedRowData,function(i,obj){
					
		// 				// if ( obj.U_License != null && JSON.parse(obj.U_License).length > 0) {
					
		// 				if ( obj.key != null && obj.key != undefined) {
		// 						$.each(locations,function(j,sObj){
			
		// 									// $.each(obj.key , function(k,m){
		// 										if(obj.key == sObj.U_MetrcLicense && sObj.U_MetrcLicense != null ){
											
		// 									compressedData.push(sObj);
													
		// 										}
		// 									// })
									
		// 								// if (obj.U_License != null &&  sObj.U_MetrcLicense != null && obj.U_License == sObj.U_MetrcLicense) {
		// 								// 	compressedData.push(sObj);
		// 								// }
									
		// 						});
		// 				}
					
		// 				// var returnObj = $.grep(data.value, function (ele) {
		// 				// 	if (obj.U_License == ele.U_MetrcLicense) {
		// 				// 		return ele;
		// 				// 	}
		// 				// });
						
		// 				// if(returnObj.length > 0){
		// 				// 	compressedData.push(returnObj[0]);
		// 				// }
					
		// 		});
		// 		var data = that.removeDuplicateNames(compressedData);
	
		// 		var insideArr=[];
		// 		$.each(data , function(j,k){
		// 			k.switchStatus = true;
		// 			$.each(locations, function(i,v){
		// 			v.switchStatus = false;
		// 				if(k.U_MetrcLicense != v.U_MetrcLicense ){
		// 					insideArr.push(v);
		// 				}
		// 			});
		// 		});
			

		// 		var combinedArray = insideArr.concat(data);
		// 		var displayLisense = that.removeDuplicateNames(combinedArray);
				

		// 		// jsonModel.setProperty("/compressedData", data);
		// 		jsonModel.setProperty("/compressedData", displayLisense);
				
		// 	});
		// },
		
		onChangeActive:function(evt){
			var that = this;
			var jsonModel = this.getOwnerComponent().getModel("jsonModel");
			var oEvent = evt;
		},
		
		removeDuplicateNames: function (arr) {
			const uniqueNames = {};
			return arr.filter(item => {
				if (!uniqueNames[item.U_MetrcLicense]) {
					uniqueNames[item.U_MetrcLicense] = true;
					return true;
				}
				return false;
			});
		},


		clearData: function () {
			this.byId("labResultsTable").clearSelection();
			//this.byId("releaseTo").setSelectedKey("");
			//this.byId("search").setValue();
		},

		/*Methods for multiInput for sarch field for scan functionality start*/
		fillFilterLoad: function (elementC, removedText) {
			var orFilter = [];
			var andFilter = [];
			$.each(elementC.getTokens(), function (i, info) {
				var value = info.getText();
				if (value !== removedText) {
					orFilter.push(new sap.ui.model.Filter("U_NCBID", "Contains", value.toLowerCase()));
					orFilter.push(new sap.ui.model.Filter("U_NSTNM", "Contains", value.toLowerCase()));
					orFilter.push(new sap.ui.model.Filter("U_NPLID", "Contains", value.toLowerCase()));
					orFilter.push(new sap.ui.model.Filter("U_NPLNM", "Contains", value.toLowerCase()));
					orFilter.push(new sap.ui.model.Filter("U_NLCNM", "Contains", value.toLowerCase()));
					//orFilter.push(new sap.ui.model.Filter("U_NVGRD", "GE",   value.toLowerCase() ));
					andFilter.push(new sap.ui.model.Filter({
						filters: orFilter,
						and: false,
						caseSensitive: false
					}));
				}
			});
			this.byId("labResultsTable").getBinding("rows").filter(andFilter);
			// this.loadData(orFilter);
		},


	});
});