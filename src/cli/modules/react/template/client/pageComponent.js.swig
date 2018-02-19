import React from 'react';
import PropTypes from 'prop-types';

function {{ pageComponent }}(props) {
    return (<div>{{ page }}</div>);
}

{{ pageComponent }}.propTypes = {
    data: PropTypes.object.isRequired
};

export default {{ pageComponent }};