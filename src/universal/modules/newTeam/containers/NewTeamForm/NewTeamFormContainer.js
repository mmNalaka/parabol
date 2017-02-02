import React, {PropTypes} from 'react';
import {cashay} from 'cashay';
import emailAddresses from 'email-addresses';
import shortid from 'shortid';
import {withRouter} from 'react-router';
import {showSuccess} from 'universal/modules/toast/ducks/toastDuck';
import makeAddTeamSchema from 'universal/validation/makeAddTeamSchema';
import addOrgSchema from 'universal/validation/addOrgSchema';
import {segmentEventTrack} from 'universal/redux/segmentActions';
import {connect} from 'react-redux';
import NewTeamForm from 'universal/modules/newTeam/components/NewTeamForm/NewTeamForm';
import LoadingView from 'universal/components/LoadingView/LoadingView';


const orgDropdownMenuItemsQuery = `
query {
  organizations(userId: $userId) @live {
    id
    name
  }
}
`;

const mapStateToProps = (state) => {
  const userId = state.auth.obj.sub;
  const {organizations} = cashay.query(orgDropdownMenuItemsQuery, {
    op: 'newTeamFormContainer',
    key: userId,
    sort: {
      organizations: (a, b) => a.name > b.name ? 1 : -1
    },
    variables: {
      userId
    }
  }).data;
  const defaultOrg = organizations[0];
  const orgId = defaultOrg && defaultOrg.id || null;
  return {
    organizations,
    initialValues: {
      orgId
    },
    isNewOrg: state.form.newTeam && state.form.newTeam.values.orgId === null
  };
};

const makeInvitees = (invitees) => {
  return invitees ? invitees.map(email => ({
      email: email.address,
      fullName: email.fullName
    })) : [];
};

const NewTeamFormContainer = (props) => {
  const {dispatch, initialValues, isNewOrg, organizations, router} = props;
  const onSubmit = (submittedData) => {
    const {isNewOrg} = props;
    const newTeamId = shortid.generate();
    if (isNewOrg) {
      const schema = addOrgSchema();
      const {data: {teamName, inviteesRaw, orgName, stripeToken}} = schema(submittedData);
      const parsedInvitees = emailAddresses.parseAddressList(inviteesRaw);
      const invitees = makeInvitees(parsedInvitees);
      const variables = {
        newTeam: {
          id: newTeamId,
          name: teamName,
          orgId: shortid.generate()
        },
        invitees,
        orgName,
        stripeToken
      };
      cashay.mutate('addOrg', {variables});
      dispatch(segmentEventTrack('New Org'));
      dispatch(showSuccess({
        title: 'Organization successfully created!',
        message: `Here's your new team dashboard for ${teamName}`
      }));
    } else {
      const schema = makeAddTeamSchema();
      const {data: {teamName, inviteesRaw, orgId}} = schema(submittedData);
      const parsedInvitees = emailAddresses.parseAddressList(inviteesRaw);
      const invitees = makeInvitees(parsedInvitees);
      const variables = {
        newTeam: {
          id: newTeamId,
          name: teamName,
          orgId
        },
        invitees,
      };
      cashay.mutate('addTeam', {variables});
      dispatch(segmentEventTrack('New Team',
        {inviteeCount: invitees && invitees.length || 0}
      ));
      dispatch(showSuccess({
        title: 'Team successfully created!',
        message: `Here's your new team dashboard for ${teamName}`
      }));
    }
    router.push(`/team/${newTeamId}`);
  };
  if (organizations.length === 0) {
    // more than looks, this is required because initialValues can only be passed in once
    return <LoadingView />
  }
  return (
    <NewTeamForm
      initialValues={initialValues}
      isNewOrg={isNewOrg}
      onSubmit={onSubmit}
      organizations={organizations}
    />
  );
};

NewTeamFormContainer.propTypes = {
  dispatch: PropTypes.func.isRequired,
  router: PropTypes.object.isRequired,
};

export default connect(mapStateToProps)(
  withRouter(
    NewTeamFormContainer
  )
);
