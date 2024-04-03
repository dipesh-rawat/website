// The page and script is loaded successfully
$(document).ready(function () {
    
    function expandAllDetails() {
        const detailsElements = document.querySelectorAll('#kubectl-reference-index > details');
        detailsElements.forEach((element) => {
            element.open = true;
        });
    }

    function collapseAllDetails() {
        const detailsElements = document.querySelectorAll('#kubectl-reference-index > details');
        detailsElements.forEach((element) => {
            element.open = false;
        });
    }
    $('#kubectl-reference-expandAll').click(function () {
        expandAllDetails();
    });

    $('#kubectl-reference-collapseAll').click(function () {
        collapseAllDetails();
    });
});